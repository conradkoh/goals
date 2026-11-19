import type { CallResult, StoredGoal, StoredGoalReader } from './fakeGoals.js';
import type {
  MarkdownAdhocGoal,
  MarkdownDailyGoal,
  MarkdownQuarterlyGoalSummary,
  MarkdownQuarterSummary,
  MarkdownWeeklyGoal,
} from '../vendor/quarterly-markdown/index.js';

/** Wire args of `export.quarterSummary`, as the CLI sends them. */
export interface ExportQuarterSummaryArgs {
  year: number;
  quarter: number;
  goalIds?: string[];
  includeAdhoc?: boolean;
  adhocDomainIds?: string[];
}

/** Literal the dashboard uses for adhoc goals with no domain. */
const UNCATEGORIZED = 'UNCATEGORIZED';

const QUARTERS = [1, 2, 3, 4];

/** True when `args` satisfies the op's zod schema; `goalIds`/`adhocDomainIds` must be arrays. */
function isValidRequest(args: ExportQuarterSummaryArgs): boolean {
  return (
    Number.isInteger(args.year) &&
    QUARTERS.includes(args.quarter) &&
    (args.goalIds === undefined || Array.isArray(args.goalIds)) &&
    (args.adhocDomainIds === undefined || Array.isArray(args.adhocDomainIds))
  );
}

/** True when the goal is an owned quarterly goal of exactly this year and quarter. */
function isQuarterlyGoalOf(goal: StoredGoal | undefined, year: number, quarter: number): boolean {
  if (goal === undefined) return false;
  return goal.scope === 'quarterly' && goal.year === year && goal.quarter === quarter;
}

/** True when the adhoc goal passes the domain filter; an empty filter keeps everything. */
function matchesDomain(goal: StoredGoal, adhocDomainIds: readonly string[] | undefined): boolean {
  if (adhocDomainIds === undefined || adhocDomainIds.length === 0) return true;
  if (goal.domainId === undefined) return adhocDomainIds.includes(UNCATEGORIZED);
  return adhocDomainIds.includes(goal.domainId);
}

function dailyGoal(goal: StoredGoal): MarkdownDailyGoal {
  return {
    title: goal.title,
    ...(goal.details === undefined ? {} : { details: goal.details }),
    isComplete: goal.isComplete,
  };
}

function weeklyGoal(goal: StoredGoal, children: StoredGoal[]): MarkdownWeeklyGoal {
  return { ...dailyGoal(goal), children: children.map(dailyGoal) };
}

/** Weekly children of one quarterly goal, grouped by their ISO week. */
function weeklyGoalsByWeek(
  read: StoredGoalReader,
  quarterly: StoredGoal
): Record<number, MarkdownWeeklyGoal[]> {
  const grouped: Record<number, MarkdownWeeklyGoal[]> = {};
  for (const goal of read.childrenOf(quarterly.id, 'weekly')) {
    const week = goal.week ?? 0;
    const children = read.childrenOf(goal.id, 'daily');
    (grouped[week] ??= []).push(weeklyGoal(goal, children));
  }
  return grouped;
}

function quarterlySummary(
  read: StoredGoalReader,
  goal: StoredGoal,
  weekRange: { startWeek: number; endWeek: number }
): MarkdownQuarterlyGoalSummary {
  return {
    quarterlyGoal: {
      title: goal.title,
      ...(goal.details === undefined ? {} : { details: goal.details }),
      isComplete: goal.isComplete,
      ...(goal.completedAt === undefined ? {} : { completedAt: goal.completedAt }),
    },
    weeklyGoalsByWeek: weeklyGoalsByWeek(read, goal),
    quarter: goal.quarter ?? 0,
    year: goal.year,
    weekRange,
  };
}

function adhocSummary(goal: StoredGoal): MarkdownAdhocGoal {
  return {
    ...dailyGoal(goal),
    ...(goal.week === undefined ? {} : { adhoc: { weekNumber: goal.week } }),
  };
}

/** Selected ids, all of which the caller already proved to be goals of the quarter. */
function goalsById(read: StoredGoalReader, ids: readonly string[]): StoredGoal[] {
  return ids.flatMap((id) => {
    const goal = read.ownedGoal(id);
    return goal === undefined ? [] : [goal];
  });
}

/** The `adhocGoals` member, added only when the filter leaves at least one goal. */
function adhocGoals(
  read: StoredGoalReader,
  args: ExportQuarterSummaryArgs
): MarkdownAdhocGoal[] | undefined {
  if (args.includeAdhoc === false) return undefined;
  const weeks = read.quarterWeeks(args.year, args.quarter);
  const goals = read
    .adhocGoalsOf(args.year, weeks)
    .filter((goal) => matchesDomain(goal, args.adhocDomainIds));
  return goals.length === 0 ? undefined : goals.map(adhocSummary);
}

/**
 * `export.quarterSummary` against the fake store: mirrors the gateway's schema validation, the
 * owned-quarterly-goal guard, the adhoc domain filter and the `toMarkdownSummary` projection.
 */
export function exportQuarterSummary(
  read: StoredGoalReader,
  args: ExportQuarterSummaryArgs
): CallResult {
  if (!isValidRequest(args)) return read.invalid('Invalid export request');
  if (
    args.goalIds !== undefined &&
    !args.goalIds.every((id) => isQuarterlyGoalOf(read.ownedGoal(id), args.year, args.quarter))
  ) {
    return read.notFound();
  }
  const weekRange = read.quarterWeekRange(args.year, args.quarter);
  const selected =
    args.goalIds === undefined
      ? read.quarterlyGoalsOf(args.year, args.quarter)
      : goalsById(read, args.goalIds);
  const adhoc = adhocGoals(read, args);
  const summary: MarkdownQuarterSummary = {
    quarterlyGoals: selected.map((goal) => quarterlySummary(read, goal, weekRange)),
    year: args.year,
    quarter: args.quarter,
    weekRange,
    ...(adhoc === undefined ? {} : { adhocGoals: adhoc }),
  };
  return read.ok({ summary });
}
