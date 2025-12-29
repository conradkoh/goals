import type { Id } from '../../../../convex/_generated/dataModel';
import type { QueryCtx } from '../../../../convex/_generated/server';

/**
 * Result of finding the max week for a quarterly goal's children.
 */
export interface FindMaxWeekResult {
  /** The maximum week number found, or null if no children have states */
  maxWeek: number | null;
  /** All weekly goal IDs that have states in the max week */
  weeklyGoalIdsInMaxWeek: Set<Id<'goals'>>;
  /** All weekly goal states in the max week */
  weeklyGoalStatesInMaxWeek: {
    goalId: Id<'goals'>;
    weekNumber: number;
  }[];
}

/**
 * Finds the maximum week number where a quarterly goal's weekly children have states.
 * This represents the "last non-empty week" for a specific quarterly goal.
 *
 * This is distinct from `findLastNonEmptyWeek` in `moveGoalsFromWeek/` which:
 * - Searches backwards from a given week
 * - Checks ALL goals, not specific to one quarterly goal
 * - Crosses quarter boundaries
 *
 * @param ctx - Query context for database access
 * @param userId - The user ID
 * @param quarterlyGoalId - The quarterly goal to find max week for
 * @param year - The year of the quarter
 * @param quarter - The quarter number (1-4)
 * @returns Object containing max week number and related goal data
 */
export async function findMaxWeekForQuarterlyGoal(
  ctx: QueryCtx,
  userId: Id<'users'>,
  quarterlyGoalId: Id<'goals'>,
  year: number,
  quarter: number
): Promise<FindMaxWeekResult> {
  // First, get ALL weekly goals (depth 1) that belong to this quarterly goal
  const allWeeklyGoals = await ctx.db
    .query('goals')
    .withIndex('by_user_and_year_and_quarter_and_parent', (q) =>
      q.eq('userId', userId).eq('year', year).eq('quarter', quarter).eq('parentId', quarterlyGoalId)
    )
    .collect();

  if (allWeeklyGoals.length === 0) {
    return {
      maxWeek: null,
      weeklyGoalIdsInMaxWeek: new Set(),
      weeklyGoalStatesInMaxWeek: [],
    };
  }

  const weeklyGoalIds = allWeeklyGoals.map((g) => g._id);

  // Get all goal states for these weekly goals to find the max week
  const allWeeklyGoalStates = await ctx.db
    .query('goalStateByWeek')
    .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
      q.eq('userId', userId).eq('year', year).eq('quarter', quarter)
    )
    .filter((q) => q.or(...weeklyGoalIds.map((id) => q.eq(q.field('goalId'), id))))
    .collect();

  if (allWeeklyGoalStates.length === 0) {
    return {
      maxWeek: null,
      weeklyGoalIdsInMaxWeek: new Set(),
      weeklyGoalStatesInMaxWeek: [],
    };
  }

  // Find the max week number from the weekly goal states
  const maxWeek = allWeeklyGoalStates.reduce((max, state) => Math.max(max, state.weekNumber), 0);

  // Filter to only states in the max week
  const statesInMaxWeek = allWeeklyGoalStates.filter((state) => state.weekNumber === maxWeek);

  // Get the goal IDs from states in the max week
  const weeklyGoalIdsInMaxWeek = new Set(statesInMaxWeek.map((state) => state.goalId));

  return {
    maxWeek,
    weeklyGoalIdsInMaxWeek,
    weeklyGoalStatesInMaxWeek: statesInMaxWeek.map((s) => ({
      goalId: s.goalId,
      weekNumber: s.weekNumber,
    })),
  };
}
