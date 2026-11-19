import type { CliGoalRow, CliInitiative, CliScope } from '@workspace/shared/utilities/cli-contract';
import type {
  MarkdownAdhocGoal,
  MarkdownDailyGoal,
  MarkdownGoalLog,
  MarkdownQuarterSummary,
  MarkdownQuarterlyGoalSummary,
  MarkdownWeeklyGoal,
} from '@workspace/shared/utilities/quarterly-markdown';

import type { Doc } from '../../../convex/_generated/dataModel';
import type {
  AdhocGoalWithLogs,
  DailyGoalWithLogs,
  MultipleQuarterlyGoalsSummary,
  QuarterlyGoalSummary,
  WeeklyGoalWithLogs,
} from '../../../src/usecase/getWeekDetails';

/**
 * Pure projections from Convex rows to the shared CLI contract.
 *
 * Every function is database-free so the wire shape can be pinned with literal
 * inputs, and no raw doc ever reaches a response: ids, `userId`, `_creationTime`,
 * paths and state rows are deliberately dropped.
 */

/** Structural shape `goalToRow` accepts; both a `Doc<'goals'>` and `getGoalDetails` satisfy it. */
export interface GoalRowSource {
  _id: string;
  title: string;
  details?: string;
  isComplete: boolean;
  completedAt?: number;
  year: number;
  quarter: number;
  depth: number;
  adhoc?: { weekNumber: number; dueDate?: number };
  parentId?: string;
  initiativeId?: string;
  domainId?: string;
}

/** Non-row goal facts a caller can supply from its own query. */
export interface GoalRowExtras {
  week?: number;
  dayOfWeek?: number;
  domainName?: string;
}

/** Drops keys whose value is `undefined`, so no response ever emits `null`. */
export function compact<T>(input: T): T {
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(([, value]) => value !== undefined)
  ) as T;
}

/** Scope mapping table for non-adhoc depths; deeper goals are daily. */
const DEPTH_SCOPES: [number, CliScope][] = [
  [-1, 'adhoc'],
  [0, 'quarterly'],
  [1, 'weekly'],
];

/** Maps a goal's depth to its CLI scope; adhoc goals are recognised first. */
// fallow-ignore-next-line unused-export
export function scopeOf(doc: { depth: number; adhoc?: unknown }): CliScope {
  if (doc.adhoc !== undefined) return 'adhoc';
  return DEPTH_SCOPES.find(([depth]) => depth === doc.depth)?.[1] ?? 'daily';
}

/** Week of a row: the adhoc week for adhoc goals, the caller's week otherwise. */
function goalWeek(
  doc: GoalRowSource,
  scope: CliScope,
  week: number | undefined
): number | undefined {
  return scope === 'adhoc' ? doc.adhoc?.weekNumber : week;
}

/** Projects a goal row, omitting undefined keys instead of emitting `null`. */
export function goalToRow(doc: GoalRowSource, extras?: GoalRowExtras): CliGoalRow {
  const scope = scopeOf(doc);
  const extra = extras ?? {};
  return compact<CliGoalRow>({
    id: doc._id,
    scope,
    title: doc.title,
    details: doc.details,
    isComplete: doc.isComplete,
    completedAt: doc.completedAt,
    year: doc.year,
    quarter: scope === 'adhoc' ? undefined : doc.quarter,
    week: goalWeek(doc, scope, extra.week),
    dayOfWeek: extra.dayOfWeek,
    parentId: doc.parentId,
    initiativeId: doc.initiativeId,
    domainId: doc.domainId,
    domainName: extra.domainName,
  });
}

/** Projects an initiative row to its wire shape. */
export function initiativeToDto(doc: Doc<'initiatives'>): CliInitiative {
  const dto: CliInitiative = {
    id: doc._id,
    title: doc.title,
    startDate: doc.startDate,
  };
  if (doc.description !== undefined) dto.description = doc.description;
  if (doc.endDate !== undefined) dto.endDate = doc.endDate;
  return dto;
}

/** Projects goal logs, or `undefined` when the goal has none. */
function toMarkdownLogs(logs?: Doc<'goalLogs'>[]): MarkdownGoalLog[] | undefined {
  if (!logs || logs.length === 0) return undefined;
  return logs.map((log) => ({ logDate: log.logDate, content: log.content }));
}

/** Projects a daily goal. */
function dailyToMarkdown(goal: DailyGoalWithLogs): MarkdownDailyGoal {
  const daily: MarkdownDailyGoal = { title: goal.title, isComplete: goal.isComplete };
  if (goal.details !== undefined) daily.details = goal.details;
  const logs = toMarkdownLogs(goal.logs);
  if (logs !== undefined) daily.logs = logs;
  return daily;
}

/** Projects a weekly goal with its daily children. */
function weeklyToMarkdown(goal: WeeklyGoalWithLogs): MarkdownWeeklyGoal {
  return {
    ...dailyToMarkdown(goal),
    children: goal.children.map(dailyToMarkdown),
  };
}

/** Projects an adhoc goal; only the week number of its adhoc block is exposed. */
function adhocToMarkdown(goal: AdhocGoalWithLogs): MarkdownAdhocGoal {
  const adhoc: MarkdownAdhocGoal = { title: goal.title, isComplete: goal.isComplete };
  if (goal.details !== undefined) adhoc.details = goal.details;
  const logs = toMarkdownLogs(goal.logs);
  if (logs !== undefined) adhoc.logs = logs;
  if (goal.adhoc !== undefined) adhoc.adhoc = { weekNumber: goal.adhoc.weekNumber };
  return adhoc;
}

/** Projects one quarterly goal and its weekly groups. */
function quarterlyToMarkdown(goal: QuarterlyGoalSummary): MarkdownQuarterlyGoalSummary {
  const quarterlyGoal = compact<MarkdownQuarterlyGoalSummary['quarterlyGoal']>({
    title: goal.quarterlyGoal.title,
    details: goal.quarterlyGoal.details,
    isComplete: goal.quarterlyGoal.isComplete,
    completedAt: goal.quarterlyGoal.completedAt,
    logs: toMarkdownLogs(goal.quarterlyGoal.logs),
  });

  const weeklyGoalsByWeek: Record<number, MarkdownWeeklyGoal[]> = {};
  for (const [week, goals] of Object.entries(goal.weeklyGoalsByWeek)) {
    weeklyGoalsByWeek[Number(week)] = goals.map(weeklyToMarkdown);
  }

  return {
    quarterlyGoal,
    weeklyGoalsByWeek,
    quarter: goal.quarter,
    year: goal.year,
    weekRange: goal.weekRange,
  };
}

/**
 * Projects the dashboard's quarter summary to the shared markdown contract.
 *
 * Declaring `MarkdownQuarterSummary` as the return type is the compile-time
 * proof that the contract is satisfiable from real backend data.
 */
export function toMarkdownSummary(summary: MultipleQuarterlyGoalsSummary): MarkdownQuarterSummary {
  const markdown: MarkdownQuarterSummary = {
    quarterlyGoals: summary.quarterlyGoals.map(quarterlyToMarkdown),
    year: summary.year,
    quarter: summary.quarter,
    weekRange: summary.weekRange,
  };
  if (summary.adhocGoals !== undefined && summary.adhocGoals.length > 0) {
    markdown.adhocGoals = summary.adhocGoals.map(adhocToMarkdown);
  }
  return markdown;
}
