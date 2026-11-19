import type { FlagSpec, ParsedArgs } from '../args.js';
import { booleanFlag, parseFlags, usageFailure } from '../args.js';
import { callAsIdentity, selectIdentity } from '../auth/select.js';
import type { StoredCredential } from '../credentials.js';
import type { CommandContext } from '../deps.js';
import { isoWeekOf } from '../iso-week.js';
import {
  dayFlag,
  intFlag,
  omitUndefined,
  optionalText,
  requiredText,
  scopeFlag,
} from './goal-flags.js';
import type { CliGoalCreateArgs, CliScope } from '../vendor/cli-contract/index.js';

const CREATE_HINT = 'goals goal create --help';
const RENAME_HINT = 'goals goal rename --help';
const DELETE_HINT = 'goals goal delete --help';

const CREATE_FLAGS: FlagSpec = {
  scope: { type: 'string' },
  title: { type: 'string' },
  details: { type: 'string' },
  year: { type: 'string' },
  quarter: { type: 'string' },
  week: { type: 'string' },
  parent: { type: 'string' },
  day: { type: 'string' },
  domain: { type: 'string' },
  initiative: { type: 'string' },
  as: { type: 'string' },
};

const RENAME_FLAGS: FlagSpec = {
  title: { type: 'string' },
  as: { type: 'string' },
};

const COMPLETE_FLAGS: FlagSpec = {
  week: { type: 'string' },
  'include-children': { type: 'boolean' },
  as: { type: 'string' },
};

const DELETE_FLAGS: FlagSpec = {
  yes: { type: 'boolean' },
  as: { type: 'string' },
};

const ONE_ID = { min: 1, max: 1, name: '<id>' } as const;

/** Everything `goal create` parsed before the per-scope rules run. */
interface CreateInput {
  scope: CliScope;
  title: string;
  details: string | undefined;
  year: number | undefined;
  quarter: number | undefined;
  week: number | undefined;
  parentId: string | undefined;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7 | undefined;
  domainId: string | undefined;
  initiativeId: string | undefined;
}

function rejectPresent(value: unknown, message: string): void {
  if (value !== undefined) throw usageFailure(message, CREATE_HINT);
}

function requirePresent<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw usageFailure(message, CREATE_HINT);
  return value;
}

/** Applies the quarterly column of the create matrix. */
function quarterlyInput(input: CreateInput): CreateInput {
  rejectPresent(input.parentId, '--parent is not supported for quarterly goals');
  rejectPresent(input.dayOfWeek, '--day is not supported for quarterly goals');
  rejectPresent(input.domainId, '--domain is not supported for quarterly goals');
  return {
    ...input,
    year: requirePresent(input.year, '--year is required for quarterly goals'),
    quarter: requirePresent(input.quarter, '--quarter is required for quarterly goals'),
  };
}

/** Weekly and daily share the `--parent` requirement and current-week default. */
function childInput(input: CreateInput, week: number): CreateInput {
  rejectPresent(input.domainId, `--domain is not supported for ${input.scope} goals`);
  const parentId = requirePresent(input.parentId, `--parent is required for ${input.scope} goals`);
  if (input.scope === 'weekly') {
    rejectPresent(input.dayOfWeek, '--day is not supported for weekly goals');
    return { ...input, parentId, week: input.week ?? week };
  }
  const dayOfWeek = requirePresent(input.dayOfWeek, '--day is required for daily goals');
  return { ...input, parentId, week: input.week ?? week, dayOfWeek };
}

/** Applies the adhoc column, including the cross-year `--week` rule. */
function adhocInput(input: CreateInput, currentYear: number, currentWeek: number): CreateInput {
  rejectPresent(input.quarter, '--quarter is not supported for adhoc goals');
  rejectPresent(input.dayOfWeek, '--day is not supported for adhoc goals');
  const year = input.year ?? currentYear;
  return {
    ...input,
    year,
    week: input.week ?? requireAdhocWeek(year, currentYear, currentWeek),
  };
}

function requireAdhocWeek(year: number, currentYear: number, currentWeek: number): number {
  if (year !== currentYear) {
    throw usageFailure(
      '--week is required for adhoc goals when --year is not the current ISO year',
      CREATE_HINT
    );
  }
  return currentWeek;
}

/** Fills in defaults and enforces the per-scope matrix before any credential read. */
function createInput(input: CreateInput, now: number): CreateInput {
  if (input.scope === 'quarterly') return quarterlyInput(input);
  const current = isoWeekOf(now);
  if (input.scope === 'adhoc') return adhocInput(input, current.year, current.week);
  return childInput(input, current.week);
}

function createRequest(parsed: ParsedArgs, now: number): CliGoalCreateArgs {
  const input = createInput(
    {
      scope: scopeFlag(parsed, CREATE_HINT),
      title: requiredText(parsed, 'title', CREATE_HINT),
      details: optionalText(parsed, 'details', CREATE_HINT),
      year: intFlag(parsed, 'year', CREATE_HINT),
      quarter: intFlag(parsed, 'quarter', CREATE_HINT),
      week: intFlag(parsed, 'week', CREATE_HINT),
      parentId: optionalText(parsed, 'parent', CREATE_HINT),
      dayOfWeek: dayFlag(parsed, CREATE_HINT),
      domainId: optionalText(parsed, 'domain', CREATE_HINT),
      initiativeId: optionalText(parsed, 'initiative', CREATE_HINT),
    },
    now
  );
  return omitUndefined<CliGoalCreateArgs>({
    scope: input.scope,
    title: input.title,
    details: input.details,
    year: input.year,
    quarter: input.quarter,
    week: input.week,
    parentId: input.parentId,
    dayOfWeek: input.dayOfWeek,
    domainId: input.domainId,
    initiativeId: input.initiativeId,
  });
}

/** `goals goal create` — one goal in the requested family. */
export async function runGoalCreate(args: readonly string[], ctx: CommandContext): Promise<void> {
  const parsed = parseFlags(args, CREATE_FLAGS, CREATE_HINT);
  const request = createRequest(parsed, ctx.deps.now());
  const result = await callAsIdentity(ctx, parsed, 'goal.create', request);
  ctx.deps.stdout.write(`Created ${request.scope} goal ${result.id}.\n`);
}

/** `goals goal rename` — retitles one goal in place. */
export async function runGoalRename(args: readonly string[], ctx: CommandContext): Promise<void> {
  const parsed = parseFlags(args, RENAME_FLAGS, RENAME_HINT, ONE_ID);
  const [id = ''] = parsed.positionals;
  const title = requiredText(parsed, 'title', RENAME_HINT);
  const result = await callAsIdentity(ctx, parsed, 'goal.rename', { id, title });
  ctx.deps.stdout.write(`Renamed goal ${result.id}.\n`);
}

/** The current ISO week, named in the error when a weekly/daily goal arrives without --week. */
function missingWeek(verb: string, scope: CliScope, now: number, hint: string): never {
  const week = isoWeekOf(now).week;
  throw usageFailure(
    `--week is required to ${verb} a ${scope} goal (the current ISO week is ${week})`,
    hint
  );
}

/**
 * Resolves `--week` from the flag or, for weekly and daily goals, reports a usage error after
 * the one `goal.get` that discovers the scope. Quarterly (and adhoc) need no week.
 */
async function completionWeek(
  ctx: CommandContext,
  credential: Pick<StoredCredential, 'convexUrl' | 'token'>,
  parsed: ParsedArgs,
  id: string,
  verb: string,
  hint: string
): Promise<number | undefined> {
  const flagged = intFlag(parsed, 'week', hint);
  if (flagged !== undefined) return flagged;
  const detail = await ctx.api.call(credential, 'goal.get', { id });
  if (detail.scope === 'weekly' || detail.scope === 'daily') {
    missingWeek(verb, detail.scope, ctx.deps.now(), hint);
  }
  return undefined;
}

async function runSetComplete(
  args: readonly string[],
  ctx: CommandContext,
  isComplete: boolean
): Promise<void> {
  const verb = isComplete ? 'complete' : 'reopen';
  const hint = `goals goal ${verb} --help`;
  const parsed = parseFlags(args, COMPLETE_FLAGS, hint, ONE_ID);
  const [id = ''] = parsed.positionals;
  const { credential } = await selectIdentity(parsed, ctx);
  const week = await completionWeek(ctx, credential, parsed, id, verb, hint);
  const includeChildren = booleanFlag(parsed, 'include-children');
  const result = await ctx.api.call(
    credential,
    'goal.setComplete',
    omitUndefined({ id, isComplete, week, includeChildren: includeChildren ? true : undefined })
  );
  ctx.deps.stdout.write(
    `Goal ${result.id} is now ${result.isComplete ? 'complete' : 'incomplete'}.\n`
  );
}

/** `goals goal complete` — marks a goal (and optionally its children) complete. */
export async function runGoalComplete(args: readonly string[], ctx: CommandContext): Promise<void> {
  await runSetComplete(args, ctx, true);
}

/** `goals goal reopen` — marks a goal (and optionally its children) incomplete. */
export async function runGoalReopen(args: readonly string[], ctx: CommandContext): Promise<void> {
  await runSetComplete(args, ctx, false);
}

/** `goals goal delete` — deletes one goal and all of its child goals; `--yes` is mandatory. */
export async function runGoalDelete(args: readonly string[], ctx: CommandContext): Promise<void> {
  const parsed = parseFlags(args, DELETE_FLAGS, DELETE_HINT, ONE_ID);
  const [id = ''] = parsed.positionals;
  if (!booleanFlag(parsed, 'yes')) {
    throw usageFailure(
      `refusing to delete goal ${id} without --yes: this deletes the goal and all of its child goals`,
      DELETE_HINT
    );
  }
  const result = await callAsIdentity(ctx, parsed, 'goal.delete', { id });
  ctx.deps.stdout.write(`Deleted goal ${result.id} and all of its child goals.\n`);
}
