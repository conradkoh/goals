import type { CliOpMap } from '@workspace/shared/utilities/cli-contract';
import { z } from 'zod';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import type { OwnedGoalMeta } from '../../../../convex/cli/ops';
import { getQuarterWeeks } from '../../../../src/usecase/quarter/getQuarterWeeks';
import { invalidArgument } from '../errors';
import {
  assertWeekInQuarter,
  requireOwnedDomain,
  requireOwnedGoal,
  requireOwnedInitiative,
} from '../guards';
import type { CliOpImpl, OpCtx } from '../registry';
import { idArg, quarterArg, weekArg, yearArg } from './goalRead';

/** Daily day-of-week literals, matching the backend `DayOfWeek` constants. */
const dayOfWeekArg = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

/** Goal title, trimmed before length checks. */
const titleArg = z.string().trim().min(1).max(500);
/** Goal details. */
const detailsArg = z.string().max(20_000).optional();

/** Rejects an argument the scope does not support. */
function reject(condition: boolean, message: string): void {
  if (condition) throw invalidArgument(message);
}

/** Returns a required argument or throws a fixed 400. */
function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw invalidArgument(message);
  return value;
}

/** Returns the parent quarter, which non-adhoc goals always carry. */
function requireQuarter(meta: OwnedGoalMeta, message: string): number {
  if (meta.quarter === undefined) throw invalidArgument(message);
  return meta.quarter;
}

/** Runs an ownership guard only when an optional id is present. */
async function optionalOwned<T>(
  id: string | undefined,
  resolve: (id: string) => Promise<T>
): Promise<T | undefined> {
  if (id === undefined) return undefined;
  return await resolve(id);
}

/** Resolves an optional initiative id, 404 for foreign/missing ids. */
async function optionalInitiative(
  o: OpCtx,
  initiativeId: string | undefined
): Promise<Id<'initiatives'> | undefined> {
  return await optionalOwned(initiativeId, (id) => requireOwnedInitiative(o, id));
}

/** True when a parent goal is a scheduled (non-adhoc) goal of the given depth. */
function isParentOfDepth(meta: OwnedGoalMeta, depth: number): boolean {
  return !meta.isAdhoc && meta.depth === depth;
} /** Requires a parent of the given depth and returns it with its quarter. */
async function requireParent(
  o: OpCtx,
  parentId: string,
  depth: number,
  message: string
): Promise<{ meta: OwnedGoalMeta; quarter: number }> {
  const meta = await requireOwnedGoal(o, parentId);
  if (!isParentOfDepth(meta, depth)) throw invalidArgument(message);
  return { meta, quarter: requireQuarter(meta, message) };
}

/** Validates a weekly/daily parent's period and week, then returns it. */
async function resolveChildParent(
  o: OpCtx,
  args: CliOpMap['goal.create']['args'],
  parentId: string,
  depth: number,
  message: string,
  week: number
): Promise<OwnedGoalMeta> {
  const { meta, quarter } = await requireParent(o, parentId, depth, message);
  assertParentPeriod(meta, args.year, args.quarter);
  assertWeekInQuarter(meta.year, quarter, week);
  return meta;
}

/** True when a supplied period disagrees with the parent goal's period. */
function periodMismatch(
  meta: { year: number; quarter?: number },
  year: number | undefined,
  quarter: number | undefined
): boolean {
  return (
    (year !== undefined && year !== meta.year) ||
    (quarter !== undefined && quarter !== meta.quarter)
  );
}

/** Rejects a supplied year/quarter that disagrees with the parent goal. */
function assertParentPeriod(
  meta: { year: number; quarter?: number },
  year: number | undefined,
  quarter: number | undefined
): void {
  if (periodMismatch(meta, year, quarter)) {
    throw invalidArgument('year/quarter do not match the parent goal');
  }
}

/** Creates a quarterly goal. */
async function createQuarterly(
  o: OpCtx,
  args: CliOpMap['goal.create']['args']
): Promise<CliOpMap['goal.create']['result']> {
  reject(args.parentId !== undefined, 'parentId is not supported for quarterly goals');
  reject(args.dayOfWeek !== undefined, 'dayOfWeek is not supported for quarterly goals');
  reject(args.domainId !== undefined, 'domainId is not supported for quarterly goals');
  const year = requireValue(args.year, 'year and quarter are required for quarterly goals');
  const quarter = requireValue(args.quarter, 'year and quarter are required for quarterly goals');
  const initiativeId = await optionalInitiative(o, args.initiativeId);
  const weekNumber = args.week ?? getQuarterWeeks(year, quarter).weeks[0];
  if (args.week !== undefined) assertWeekInQuarter(year, quarter, args.week);
  const id = await o.ctx.runMutation(api.dashboard.createQuarterlyGoal, {
    sessionId: o.handle,
    year,
    quarter,
    title: args.title,
    details: args.details,
    weekNumber,
    ...(initiativeId !== undefined ? { initiativeId } : {}),
  });
  return { id };
}

/** Creates a weekly goal under a quarterly parent. */
async function createWeekly(
  o: OpCtx,
  args: CliOpMap['goal.create']['args']
): Promise<CliOpMap['goal.create']['result']> {
  reject(args.dayOfWeek !== undefined, 'dayOfWeek is not supported for weekly goals');
  reject(args.domainId !== undefined, 'domainId is not supported for weekly goals');
  const parentId = requireValue(args.parentId, 'parentId is required for weekly goals');
  const week = requireValue(args.week, 'week is required for weekly goals');
  const meta = await resolveChildParent(
    o,
    args,
    parentId,
    0,
    'parent must be a quarterly goal',
    week
  );
  const initiativeId = await optionalInitiative(o, args.initiativeId);
  const id = await o.ctx.runMutation(api.dashboard.createWeeklyGoal, {
    sessionId: o.handle,
    title: args.title,
    details: args.details,
    parentId: meta.id,
    weekNumber: week,
    ...(initiativeId !== undefined ? { initiativeId } : {}),
  });
  return { id };
}

/** Creates a daily goal under a weekly parent. */
async function createDaily(
  o: OpCtx,
  args: CliOpMap['goal.create']['args']
): Promise<CliOpMap['goal.create']['result']> {
  reject(args.domainId !== undefined, 'domainId is not supported for daily goals');
  const parentId = requireValue(args.parentId, 'parentId is required for daily goals');
  const week = requireValue(args.week, 'week is required for daily goals');
  const dayOfWeek = requireValue(args.dayOfWeek, 'dayOfWeek is required for daily goals');
  const meta = await resolveChildParent(o, args, parentId, 1, 'parent must be a weekly goal', week);
  const initiativeId = await optionalInitiative(o, args.initiativeId);
  const id = await o.ctx.runMutation(api.dashboard.createDailyGoal, {
    sessionId: o.handle,
    title: args.title,
    details: args.details,
    parentId: meta.id,
    weekNumber: week,
    dayOfWeek,
    ...(initiativeId !== undefined ? { initiativeId } : {}),
  });
  return { id };
}

/** Resolves an optional adhoc parent and rejects a non-adhoc one. */
async function optionalAdhocParent(
  o: OpCtx,
  parentId: string | undefined
): Promise<OwnedGoalMeta | undefined> {
  const parent = await optionalOwned(parentId, (id) => requireOwnedGoal(o, id));
  if (parent !== undefined && !parent.isAdhoc) {
    throw invalidArgument('parent must be an adhoc goal');
  }
  return parent;
}

/** Creates an adhoc goal; `dayOfWeek` and `quarter` are rejected by design. */
async function createAdhoc(
  o: OpCtx,
  args: CliOpMap['goal.create']['args']
): Promise<CliOpMap['goal.create']['result']> {
  reject(args.quarter !== undefined, 'quarter is not supported for adhoc goals');
  reject(args.dayOfWeek !== undefined, 'dayOfWeek is not supported for adhoc goals');
  const year = requireValue(args.year, 'year is required for adhoc goals');
  const week = requireValue(args.week, 'week is required for adhoc goals');
  const parent = await optionalAdhocParent(o, args.parentId);
  const domainId = await optionalOwned(args.domainId, (id) => requireOwnedDomain(o, id));
  const initiativeId = await optionalInitiative(o, args.initiativeId);
  const id = await o.ctx.runMutation(api.adhocGoal.createAdhocGoal, {
    sessionId: o.handle,
    title: args.title,
    details: args.details,
    year,
    weekNumber: week,
    ...(domainId !== undefined ? { domainId } : {}),
    ...(parent !== undefined ? { parentId: parent.id } : {}),
    ...(initiativeId !== undefined ? { initiativeId } : {}),
  });
  return { id };
}

/** `goal.create` — one goal in the requested family, via the existing mutation. */
export const goalCreateOp: CliOpImpl<'goal.create'> = {
  args: z.strictObject({
    scope: z.enum(['quarterly', 'weekly', 'daily', 'adhoc']),
    title: titleArg,
    details: detailsArg,
    year: yearArg.optional(),
    quarter: quarterArg.optional(),
    week: weekArg.optional(),
    parentId: idArg.optional(),
    dayOfWeek: dayOfWeekArg.optional(),
    domainId: idArg.optional(),
    initiativeId: idArg.optional(),
  }),
  async run(o, args): Promise<CliOpMap['goal.create']['result']> {
    if (args.scope === 'quarterly') return createQuarterly(o, args);
    if (args.scope === 'weekly') return createWeekly(o, args);
    if (args.scope === 'daily') return createDaily(o, args);
    return createAdhoc(o, args);
  },
};

/** `goal.rename` — retitles in place, preserving details and due date. */
export const goalRenameOp: CliOpImpl<'goal.rename'> = {
  args: z.strictObject({ id: idArg, title: titleArg }),
  async run(o, args): Promise<CliOpMap['goal.rename']['result']> {
    const meta = await requireOwnedGoal(o, args.id);
    if (meta.isAdhoc) {
      await o.ctx.runMutation(api.adhocGoal.updateAdhocGoal, {
        sessionId: o.handle,
        goalId: meta.id,
        title: args.title,
      });
      return { id: meta.id };
    }
    // `dueDate` is always passed: the existing mutations clear it when omitted.
    if (meta.depth === 0) {
      await o.ctx.runMutation(api.dashboard.updateQuarterlyGoalTitle, {
        sessionId: o.handle,
        goalId: meta.id,
        title: args.title,
        dueDate: meta.dueDate,
      });
    } else {
      await o.ctx.runMutation(api.dashboard.updateGoalTitle, {
        sessionId: o.handle,
        goalId: meta.id,
        title: args.title,
        dueDate: meta.dueDate,
      });
    }
    return { id: meta.id };
  },
};

/** Week number used to complete a non-adhoc goal. */
function completionWeek(meta: OwnedGoalMeta, week: number | undefined): number {
  if (week !== undefined) return week;
  if (meta.depth === 0) {
    return getQuarterWeeks(meta.year, requireQuarter(meta, 'goal has no quarter')).weeks[0];
  }
  throw invalidArgument('week is required for weekly and daily goals');
}

/** `goal.setComplete` — completion through the existing toggle mutation. */
export const goalSetCompleteOp: CliOpImpl<'goal.setComplete'> = {
  args: z.strictObject({
    id: idArg,
    isComplete: z.boolean(),
    week: weekArg.optional(),
    includeChildren: z.boolean().optional(),
  }),
  async run(o, args): Promise<CliOpMap['goal.setComplete']['result']> {
    const meta = await requireOwnedGoal(o, args.id);
    if (meta.isAdhoc) {
      await o.ctx.runMutation(api.adhocGoal.updateAdhocGoal, {
        sessionId: o.handle,
        goalId: meta.id,
        isComplete: args.isComplete,
      });
      return { id: meta.id, isComplete: args.isComplete };
    }
    const weekNumber = completionWeek(meta, args.week);
    assertWeekInQuarter(meta.year, requireQuarter(meta, 'goal has no quarter'), weekNumber);
    await o.ctx.runMutation(api.dashboard.toggleGoalCompletion, {
      sessionId: o.handle,
      goalId: meta.id,
      weekNumber,
      isComplete: args.isComplete,
      updateChildren: args.includeChildren === true ? true : undefined,
    });
    return { id: meta.id, isComplete: args.isComplete };
  },
};

/** `goal.delete` — cascade is owned by the existing mutations. */
export const goalDeleteOp: CliOpImpl<'goal.delete'> = {
  args: z.strictObject({ id: idArg }),
  async run(o, args): Promise<CliOpMap['goal.delete']['result']> {
    const meta = await requireOwnedGoal(o, args.id);
    if (meta.isAdhoc) {
      await o.ctx.runMutation(api.adhocGoal.deleteAdhocGoal, {
        sessionId: o.handle,
        goalId: meta.id,
      });
    } else {
      await o.ctx.runMutation(api.goal.deleteGoal, {
        sessionId: o.handle,
        goalId: meta.id,
      });
    }
    return { id: meta.id };
  },
};
