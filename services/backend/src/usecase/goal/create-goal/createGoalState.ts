import type { Id } from '../../../../convex/_generated/dataModel';
import type { MutationCtx } from '../../../../convex/_generated/server';
import type { DayOfWeek } from '../../../constants';

/**
 * Parameters for creating a goal state entry.
 */
export interface CreateGoalStateParams {
  ctx: MutationCtx;
  userId: Id<'users'>;
  goalId: Id<'goals'>;
  year: number;
  quarter: number;
  weekNumber: number;
  isStarred?: boolean;
  isPinned?: boolean;
  daily?: { dayOfWeek: DayOfWeek; dateTimestamp?: number };
}

/**
 * Creates a goalStateByWeek entry with consistent defaults.
 *
 * This helper ensures all goal state entries are created with the same
 * structure and default values.
 *
 * @param params - The parameters for creating the goal state
 * @returns The ID of the newly created goal state
 */
export async function createGoalState(
  params: CreateGoalStateParams
): Promise<Id<'goalStateByWeek'>> {
  const {
    ctx,
    userId,
    goalId,
    year,
    quarter,
    weekNumber,
    isStarred = false,
    isPinned = false,
    daily,
  } = params;

  const stateData: {
    userId: Id<'users'>;
    year: number;
    quarter: number;
    goalId: Id<'goals'>;
    weekNumber: number;
    isStarred: boolean;
    isPinned: boolean;
    daily?: { dayOfWeek: DayOfWeek; dateTimestamp?: number };
  } = {
    userId,
    year,
    quarter,
    goalId,
    weekNumber,
    isStarred,
    isPinned,
  };

  // Only add daily field if provided
  if (daily) {
    stateData.daily = daily;
  }

  return await ctx.db.insert('goalStateByWeek', stateData);
}
