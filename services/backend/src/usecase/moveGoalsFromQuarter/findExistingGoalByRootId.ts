import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { QueryCtx } from '../../../convex/_generated/server';

/**
 * Finds an existing goal in the target quarter that has the same rootGoalId.
 *
 * This is used to support idempotent goal migration - if a goal has already been
 * pulled into a quarter, we should reuse it instead of creating a duplicate.
 *
 * A goal's rootGoalId is determined by:
 * - carryOver.fromGoal.rootGoalId if the goal was carried over
 * - The goal's own _id if it's the original goal
 *
 * @param ctx - Query context for database access
 * @param userId - The user ID
 * @param rootGoalId - The root goal ID to search for
 * @param targetYear - The year of the target quarter
 * @param targetQuarter - The quarter number (1-4) of the target quarter
 * @param depth - The depth of the goal (0=quarterly, 1=weekly, 2=daily)
 * @param parentId - Optional parent ID for weekly/daily goals
 * @returns The existing goal if found, null otherwise
 */
export async function findExistingGoalByRootId(
  ctx: QueryCtx,
  userId: Id<'users'>,
  rootGoalId: Id<'goals'>,
  targetYear: number,
  targetQuarter: number,
  depth: 0 | 1 | 2,
  parentId?: Id<'goals'>
): Promise<Doc<'goals'> | null> {
  // Query all goals in the target quarter at the specified depth
  const goalsInTargetQuarter = await ctx.db
    .query('goals')
    .withIndex('by_user_and_year_and_quarter', (q) =>
      q.eq('userId', userId).eq('year', targetYear).eq('quarter', targetQuarter)
    )
    .filter((q) => q.eq(q.field('depth'), depth))
    .collect();

  // Find a goal that matches the rootGoalId
  for (const goal of goalsInTargetQuarter) {
    // Get this goal's rootGoalId
    const thisRootGoalId = goal.carryOver?.fromGoal?.rootGoalId ?? goal._id;

    if (thisRootGoalId === rootGoalId) {
      // For weekly/daily goals, also check that the parent matches
      if (depth > 0 && parentId !== undefined) {
        if (goal.parentId === parentId) {
          return goal;
        }
        // Parent doesn't match - this could be a goal under a different parent
        // Continue searching
      } else {
        // Quarterly goal or no parent check needed
        return goal;
      }
    }
  }

  return null;
}

/**
 * Builds a map of rootGoalId -> existing goal for a set of goals in the target quarter.
 *
 * This is more efficient when checking multiple goals at once.
 *
 * @param ctx - Query context for database access
 * @param userId - The user ID
 * @param targetYear - The year of the target quarter
 * @param targetQuarter - The quarter number (1-4) of the target quarter
 * @param depth - The depth of the goals (0=quarterly, 1=weekly, 2=daily)
 * @returns Map of rootGoalId string -> existing goal
 */
export async function buildExistingGoalsMap(
  ctx: QueryCtx,
  userId: Id<'users'>,
  targetYear: number,
  targetQuarter: number,
  depth: 0 | 1 | 2
): Promise<Map<string, Doc<'goals'>>> {
  // Query all goals in the target quarter at the specified depth
  const goalsInTargetQuarter = await ctx.db
    .query('goals')
    .withIndex('by_user_and_year_and_quarter', (q) =>
      q.eq('userId', userId).eq('year', targetYear).eq('quarter', targetQuarter)
    )
    .filter((q) => q.eq(q.field('depth'), depth))
    .collect();

  // Build a map of rootGoalId -> goal
  const existingGoalsMap = new Map<string, Doc<'goals'>>();

  for (const goal of goalsInTargetQuarter) {
    const rootGoalId = goal.carryOver?.fromGoal?.rootGoalId ?? goal._id;
    existingGoalsMap.set(rootGoalId.toString(), goal);
  }

  return existingGoalsMap;
}
