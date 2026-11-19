import type { FlagSpec, ParsedArgs } from '../args.js';
import { booleanFlag, parseFlags, usageFailure } from '../args.js';
import { selectIdentity } from '../auth/select.js';
import type { CommandContext } from '../deps.js';
import { toJson } from '../output.js';
import { intFlag, omitUndefined, optionalText, requiredInt, scopeFlag } from './goal-flags.js';
import { formatGoalDetail, formatGoalTable, truncationNote } from './goal-format.js';
import type { CliGoalDetail, CliGoalListArgs, CliScope } from '../vendor/cli-contract/index.js';

const LIST_HINT = 'goals goal list --help';
const GET_HINT = 'goals goal get --help';

const LIST_FLAGS: FlagSpec = {
  scope: { type: 'string' },
  year: { type: 'string' },
  quarter: { type: 'string' },
  week: { type: 'string' },
  initiative: { type: 'string' },
  limit: { type: 'string' },
  json: { type: 'boolean' },
  as: { type: 'string' },
};

const GET_FLAGS: FlagSpec = {
  json: { type: 'boolean' },
  as: { type: 'string' },
};

const ONE_ID = { min: 1, max: 1, name: '<id>' } as const;

interface ListPeriod {
  year: number;
  quarter?: number;
  week?: number;
}

/** Rejects a flag the scope does not accept; the value itself is still range-checked. */
function rejectFlag(parsed: ParsedArgs, name: 'week' | 'quarter', message: string): void {
  if (intFlag(parsed, name, LIST_HINT) !== undefined) throw usageFailure(message, LIST_HINT);
}

function quarterlyPeriod(parsed: ParsedArgs): ListPeriod {
  const year = requiredInt(parsed, 'year', 'for quarterly goals', LIST_HINT);
  const quarter = requiredInt(parsed, 'quarter', 'for quarterly goals', LIST_HINT);
  rejectFlag(parsed, 'week', '--week is not supported for quarterly goals');
  return { year, quarter };
}

function adhocPeriod(parsed: ParsedArgs): ListPeriod {
  const year = requiredInt(parsed, 'year', 'for adhoc goals', LIST_HINT);
  rejectFlag(parsed, 'quarter', '--quarter is not supported for adhoc goals');
  return { year, week: intFlag(parsed, 'week', LIST_HINT) };
}

function weekPeriod(parsed: ParsedArgs): ListPeriod {
  return {
    year: requiredInt(parsed, 'year', 'for weekly and daily goals', LIST_HINT),
    quarter: requiredInt(parsed, 'quarter', 'for weekly and daily goals', LIST_HINT),
    week: requiredInt(parsed, 'week', 'for weekly and daily goals', LIST_HINT),
  };
}

/** `--year` plus the per-scope quarter/week rules from `goalRead.ts`; runs before any I/O. */
function listPeriod(parsed: ParsedArgs, scope: CliScope): ListPeriod {
  if (scope === 'quarterly') return quarterlyPeriod(parsed);
  if (scope === 'adhoc') return adhocPeriod(parsed);
  return weekPeriod(parsed);
}

function writeTruncation(ctx: CommandContext, truncated: boolean, shown: number): void {
  if (truncated) ctx.deps.stderr.write(truncationNote('goals', shown));
}

/** `goals goal list` — a bounded list of goals in one scope. */
export async function runGoalList(args: readonly string[], ctx: CommandContext): Promise<void> {
  const parsed = parseFlags(args, LIST_FLAGS, LIST_HINT);
  const scope = scopeFlag(parsed, LIST_HINT, 'quarterly');
  const period = listPeriod(parsed, scope);
  const request = omitUndefined<CliGoalListArgs>({
    scope,
    ...period,
    initiativeId: optionalText(parsed, 'initiative', LIST_HINT),
    limit: intFlag(parsed, 'limit', LIST_HINT),
  });
  const { credential } = await selectIdentity(parsed, ctx);
  const result = await ctx.api.call(credential, 'goal.list', request);

  writeTruncation(ctx, result.truncated, result.items.length);
  if (booleanFlag(parsed, 'json')) {
    ctx.deps.stdout.write(toJson(result.items));
    return;
  }
  ctx.deps.stdout.write(
    result.items.length === 0 ? 'No goals found.\n' : formatGoalTable(result.items)
  );
}

/** `goals goal get` — one goal with parent, children, details and due date. */
export async function runGoalGet(args: readonly string[], ctx: CommandContext): Promise<void> {
  const parsed = parseFlags(args, GET_FLAGS, GET_HINT, ONE_ID);
  const [id = ''] = parsed.positionals;
  const { credential } = await selectIdentity(parsed, ctx);
  const detail: CliGoalDetail = await ctx.api.call(credential, 'goal.get', { id });
  ctx.deps.stdout.write(booleanFlag(parsed, 'json') ? toJson(detail) : formatGoalDetail(detail));
}
