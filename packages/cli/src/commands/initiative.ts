import type { FlagSpec } from '../args.js';
import { booleanFlag, parseFlags } from '../args.js';
import { callAsIdentity } from '../auth/select.js';
import type { CommandContext } from '../deps.js';
import { runFamilyAction } from '../dispatch.js';
import { formatKeyValues, formatTable, toJson } from '../output.js';
import { intFlag, omitUndefined } from './goal-flags.js';
import { formatGoalTable, isoDate, plainTextBlock, truncationNote } from './goal-format.js';
import { writeBoundedList } from './list-output.js';
import type { CliInitiative } from '../vendor/cli-contract/index.js';

const LIST_HINT = 'goals initiative list --help';
const GET_HINT = 'goals initiative get --help';

const LIST_FLAGS: FlagSpec = {
  limit: { type: 'string' },
  json: { type: 'boolean' },
  as: { type: 'string' },
};

const GET_FLAGS: FlagSpec = {
  json: { type: 'boolean' },
  as: { type: 'string' },
};

const ONE_ID = { min: 1, max: 1, name: '<id>' } as const;
const HEADERS = ['ID', 'START', 'END', 'TITLE'] as const;

function initiativeRow(initiative: CliInitiative): string[] {
  return [
    initiative.id,
    isoDate(initiative.startDate),
    initiative.endDate === undefined ? '-' : isoDate(initiative.endDate),
    initiative.title,
  ];
}

/** `goals initiative list` — a bounded list of initiatives. */
async function runInitiativeList(args: readonly string[], ctx: CommandContext): Promise<void> {
  const parsed = parseFlags(args, LIST_FLAGS, LIST_HINT);
  const request = omitUndefined({ limit: intFlag(parsed, 'limit', LIST_HINT) });
  const result = await callAsIdentity(ctx, parsed, 'initiative.list', request);

  if (result.truncated) ctx.deps.stderr.write(truncationNote('initiatives', result.items.length));
  writeBoundedList(ctx, parsed, result, 'No initiatives found.\n', (items) =>
    formatTable(HEADERS, items.map(initiativeRow), [])
  );
}

function initiativeRows(initiative: CliInitiative): (readonly [string, string])[] {
  const rows: (readonly [string, string])[] = [
    ['ID', initiative.id],
    ['Title', initiative.title],
    ['Start', isoDate(initiative.startDate)],
  ];
  if (initiative.endDate !== undefined) rows.push(['End', isoDate(initiative.endDate)]);
  return rows;
}

type InitiativeDetail = Awaited<ReturnType<typeof callAsIdentity<'initiative.get'>>>;

/** The text page: key/values, plain-text description, then the goals table or an empty note. */
function formatInitiativeDetail(result: InitiativeDetail): string {
  const goals = result.goals.items;
  const blocks = [
    formatKeyValues(initiativeRows(result.initiative)).trimEnd(),
    ...plainTextBlock('Description:', result.initiative.description ?? ''),
    '',
    'Goals:',
    goals.length === 0 ? 'No goals found.' : formatGoalTable(goals).trimEnd(),
  ];
  return `${blocks.join('\n')}\n`;
}

/** `goals initiative get` — one initiative plus its goals table. */
async function runInitiativeGet(args: readonly string[], ctx: CommandContext): Promise<void> {
  const parsed = parseFlags(args, GET_FLAGS, GET_HINT, ONE_ID);
  const [id = ''] = parsed.positionals;
  const result = await callAsIdentity(ctx, parsed, 'initiative.get', { id });

  // Diagnostics go to stderr in both modes; stdout carries only the requested result.
  if (result.goals.truncated) {
    ctx.deps.stderr.write(truncationNote('goals', result.goals.items.length));
  }
  if (booleanFlag(parsed, 'json')) {
    ctx.deps.stdout.write(toJson({ initiative: result.initiative, goals: result.goals.items }));
    return;
  }
  ctx.deps.stdout.write(formatInitiativeDetail(result));
}

const ACTIONS = {
  list: runInitiativeList,
  get: runInitiativeGet,
};

export async function runInitiativeCommand(
  args: readonly string[],
  ctx: CommandContext
): Promise<void> {
  await runFamilyAction('initiative', ACTIONS, args, ctx);
}
