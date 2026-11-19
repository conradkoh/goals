import type {
  CliGoalDetail,
  CliGoalRow,
  CliList,
  CliOpMap,
} from '@workspace/shared/utilities/cli-contract';
import { z } from 'zod';

import { api } from '../../../../convex/_generated/api';
import type { Doc } from '../../../../convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '../../../../src/usecase/getWeekDetails';
import { CLI_LIST_DEFAULT_LIMIT, CLI_LIST_MAX_LIMIT } from '../../constants';
import { invalidArgument, notFound } from '../errors';
import { requireOwnedGoal, requireOwnedInitiative } from '../guards';
import { goalToRow, compact } from '../mappers';
import type { CliOpImpl, OpCtx } from '../registry';

/** Shared id argument: an opaque Convex id string. */
export const idArg = z.string().min(1).max(64);
/** Shared calendar-year argument. */
export const yearArg = z.number().int().min(2000).max(2100);
/** Shared quarter argument. */
export const quarterArg = z.number().int().min(1).max(4);
/** Shared ISO week argument. */
export const weekArg = z.number().int().min(1).max(53);
/** Shared list bound; defaults and maxima live in `constants.ts`. */
export const limitArg = z.number().int().min(1).max(CLI_LIST_MAX_LIMIT).optional();

/** Applies the contract's 200/500 list bound and reports truncation. */
export function boundList<T>(rows: T[], limit?: number): CliList<T> {
  const max = limit ?? CLI_LIST_DEFAULT_LIMIT;
  return { items: rows.slice(0, max), truncated: rows.length > max };
}

/** Rejects an argument combination the scope does not support. */
function reject(condition: boolean, message: string): void {
  if (condition) throw invalidArgument(message);
}

/** Scope-specific `goal.list` requirements. */
function assertQuarterlyList(args: CliOpMap['goal.list']['args']): void {
  if (args.quarter === undefined) {
    throw invalidArgument('quarter is required for quarterly goals');
  }
  reject(args.week !== undefined, 'week is not supported for quarterly goals');
}

/** Adhoc lists are week-level; a quarter filter is meaningless. */
function assertAdhocList(args: CliOpMap['goal.list']['args']): void {
  reject(args.quarter !== undefined, 'quarter is not supported for adhoc goals');
}

/** Weekly and daily lists need both a quarter and a week. */
function assertWeeklyList(args: CliOpMap['goal.list']['args']): void {
  if (args.quarter === undefined || args.week === undefined) {
    throw invalidArgument('quarter and week are required for weekly and daily goals');
  }
}

/** Validates the per-scope requirements of `goal.list`. */
function assertListArgs(args: CliOpMap['goal.list']['args']): void {
  if (args.scope === 'quarterly') return assertQuarterlyList(args);
  if (args.scope === 'adhoc') return assertAdhocList(args);
  assertWeeklyList(args);
}

/** True when an adhoc goal belongs to the requested week (or no week was given). */
function matchesAdhocWeek(doc: Doc<'goals'>, week: number | undefined): boolean {
  return week === undefined || doc.adhoc?.weekNumber === week;
}

/** True when an initiative-grouped goal belongs to the requested list. */
function matchesListFilter(doc: Doc<'goals'>, args: CliOpMap['goal.list']['args']): boolean {
  if (doc.year !== args.year) return false;
  return args.scope === 'adhoc' ? matchesAdhocWeek(doc, args.week) : doc.quarter === args.quarter;
}

/** Rows of one scope that carry an initiative, narrowed by year/quarter/week. */
async function listByInitiative(
  o: OpCtx,
  args: CliOpMap['goal.list']['args'],
  initiativeId: string
): Promise<CliGoalRow[]> {
  const initiativeIdArg = await requireOwnedInitiative(o, initiativeId);
  const groups = await o.ctx.runQuery(api.initiative.getGoalsByInitiative, {
    sessionId: o.handle,
    initiativeId: initiativeIdArg,
  });
  return groups[args.scope]
    .filter((doc) => matchesListFilter(doc, args))
    .map((doc) => goalToRow(doc));
}

/** Quarterly rows, counts dropped. */
async function listQuarterly(o: OpCtx, args: CliOpMap['goal.list']['args']): Promise<CliGoalRow[]> {
  if (args.quarter === undefined) throw invalidArgument('quarter is required for quarterly goals');
  const goals = await o.ctx.runQuery(api.dashboard.getAllQuarterlyGoalsForQuarter, {
    sessionId: o.handle,
    year: args.year,
    quarter: args.quarter,
  });
  return goals.map((goal) => {
    const row: CliGoalRow = {
      id: goal._id,
      scope: 'quarterly',
      title: goal.title,
      isComplete: goal.isComplete,
      year: args.year,
      quarter: args.quarter,
    };
    if (goal.completedAt !== undefined) row.completedAt = goal.completedAt;
    return row;
  });
}

/** True when a week-tree node belongs to the requested scope. */
function nodeMatchesScope(node: GoalWithDetailsAndChildren, scope: 'weekly' | 'daily'): boolean {
  return scope === 'weekly' ? node.depth === 1 : node.depth >= 2;
}

/** Walks a week tree recursively, collecting nodes of the requested scope. */
function collectWeekNodes(
  nodes: GoalWithDetailsAndChildren[],
  scope: 'weekly' | 'daily',
  week: number,
  rows: CliGoalRow[]
): void {
  for (const node of nodes) {
    if (nodeMatchesScope(node, scope)) {
      rows.push(goalToRow(node, { week, dayOfWeek: node.state?.daily?.dayOfWeek }));
    }
    collectWeekNodes(node.children, scope, week, rows);
  }
}

/** Weekly or daily rows for one week. */
async function listWeek(o: OpCtx, args: CliOpMap['goal.list']['args']): Promise<CliGoalRow[]> {
  if (args.quarter === undefined || args.week === undefined) {
    throw invalidArgument('quarter and week are required for weekly and daily goals');
  }
  const week = await o.ctx.runQuery(api.dashboard.getWeek, {
    sessionId: o.handle,
    year: args.year,
    quarter: args.quarter,
    weekNumber: args.week,
  });
  const rows: CliGoalRow[] = [];
  collectWeekNodes(
    week.tree.quarterlyGoals,
    args.scope === 'weekly' ? 'weekly' : 'daily',
    args.week,
    rows
  );
  return rows;
}

/** Adhoc rows for a year, optionally narrowed to one week. */
async function listAdhoc(o: OpCtx, args: CliOpMap['goal.list']['args']): Promise<CliGoalRow[]> {
  const goals =
    args.week === undefined
      ? await o.ctx.runQuery(api.adhocGoal.getAllAdhocGoals, { sessionId: o.handle })
      : await o.ctx.runQuery(api.adhocGoal.getAdhocGoalsForWeekFlat, {
          sessionId: o.handle,
          year: args.year,
          weekNumber: args.week,
        });
  return goals
    .filter((goal) => goal.year === args.year)
    .map((goal) => goalToRow(goal, { domainName: goal.domain?.name }));
}

/** Owned rows for one `goal.list` request. */
async function listRows(o: OpCtx, args: CliOpMap['goal.list']['args']): Promise<CliGoalRow[]> {
  if (args.initiativeId !== undefined) return listByInitiative(o, args, args.initiativeId);
  if (args.scope === 'quarterly') return listQuarterly(o, args);
  if (args.scope === 'adhoc') return listAdhoc(o, args);
  return listWeek(o, args);
}

/** `goal.list` — bounded list of the credential owner's goals in one scope. */
export const goalListOp: CliOpImpl<'goal.list'> = {
  args: z.strictObject({
    scope: z.enum(['quarterly', 'weekly', 'daily', 'adhoc']),
    year: yearArg,
    quarter: quarterArg.optional(),
    week: weekArg.optional(),
    initiativeId: idArg.optional(),
    limit: limitArg,
  }),
  async run(o, args): Promise<CliOpMap['goal.list']['result']> {
    assertListArgs(args);
    return boundList(await listRows(o, args), args.limit);
  },
};

/** `goal.get` — one owned goal with parent title, due date and children. */
export const goalGetOp: CliOpImpl<'goal.get'> = {
  args: z.strictObject({ id: idArg }),
  async run(o, args): Promise<CliOpMap['goal.get']['result']> {
    const meta = await requireOwnedGoal(o, args.id);
    const detail = await o.ctx.runQuery(api.dashboard.getGoalDetails, {
      sessionId: o.handle,
      goalId: meta.id,
    });
    if (detail === null) throw notFound();
    const row = goalToRow(detail, { domainName: detail.domain?.name });
    return compact<CliGoalDetail>({
      ...row,
      parentTitle: detail.parentTitle,
      dueDate: detail.dueDate,
      children: detail.children.map((child) => ({
        id: child._id,
        title: child.title,
        isComplete: child.isComplete,
      })),
    });
  },
};
