import { Doc, Id } from '../../../convex/_generated/dataModel';
import { MutationCtx } from '../../../convex/_generated/server';
import { TimePeriod, GoalDepth } from './types';
import { getGoalsForWeek } from './moveGoalsFromWeek';

/**
 * Find the last non-empty week before the given week that has moveable (incomplete) goals
 * @param ctx - The database context
 * @param userId - The user ID
 * @param currentWeek - The current week to search backwards from
 * @returns The last non-empty week with moveable goals or null if none found
 */
export async function findLastNonEmptyWeek(
  ctx: MutationCtx,
  userId: Id<'users'>,
  currentWeek: TimePeriod
): Promise<TimePeriod | null> {
  let searchWeek = {
    year: currentWeek.year,
    quarter: currentWeek.quarter,
    weekNumber: currentWeek.weekNumber - 1,
  };

  // Search backwards up to 13 weeks (one quarter)
  const maxWeeksToSearch = 13;
  let weeksSearched = 0;

  while (weeksSearched < maxWeeksToSearch) {
    // If we go below week 1, we need to go to the previous quarter
    if (searchWeek.weekNumber < 1) {
      searchWeek.quarter -= 1;
      
      // If we go below quarter 1, go to previous year
      if (searchWeek.quarter < 1) {
        searchWeek.year -= 1;
        searchWeek.quarter = 4;
      }
      
      // Set to week 13 of the previous quarter (typical max weeks in a quarter)
      searchWeek.weekNumber = 13;
    }

    try {
      // Check if this week has any moveable goals
      const hasMovableGoals = await hasIncompleteGoalsInWeek(ctx, userId, searchWeek);
      
      if (hasMovableGoals) {
        // Found a non-empty week with moveable goals
        return searchWeek;
      }
    } catch (error) {
      // If there's an error fetching goals for this week, continue searching
      console.warn(`Error checking week ${searchWeek.year}-Q${searchWeek.quarter}-W${searchWeek.weekNumber}:`, error);
    }

    // Move to the previous week
    searchWeek.weekNumber -= 1;
    weeksSearched += 1;
  }

  // No non-empty week found within the search limit
  return null;
}

/**
 * Check if a week has any incomplete goals that can be moved
 * @param ctx - The database context
 * @param userId - The user ID
 * @param week - The week to check
 * @returns True if the week has moveable goals, false otherwise
 */
async function hasIncompleteGoalsInWeek(
  ctx: MutationCtx,
  userId: Id<'users'>,
  week: TimePeriod
): Promise<boolean> {
  const weekStates = await getGoalsForWeek(ctx, userId, week);
  
  if (weekStates.length === 0) {
    return false;
  }

  // Get all goal documents
  const goalIds = weekStates.map((state) => state.goalId);
  const goalPromises = goalIds.map((id) => ctx.db.get(id));
  const goals = await Promise.all(goalPromises);

  // Check each goal to see if it's moveable
  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i];
    
    if (!goal) continue;

    // Check based on goal depth
    if (goal.depth === GoalDepth.Weekly) {
      // For weekly goals, check if the goal itself is incomplete OR if it has incomplete daily goals
      if (!goal.isComplete) {
        return true;
      }

      // Check for incomplete daily goals - find child goals using the database query
      const dailyGoals = await ctx.db
        .query('goals')
        .filter((q) => 
          q.and(
            q.eq(q.field('parentId'), goal._id),
            q.eq(q.field('depth'), GoalDepth.Daily),
            q.eq(q.field('isComplete'), false)
          )
        )
        .collect();

      if (dailyGoals.length > 0) {
        return true;
      }
    } else if (goal.depth === GoalDepth.Quarterly) {
      // Quarterly goals can be moved if they're incomplete
      if (!goal.isComplete) {
        return true;
      }
    }
    // Daily goals are handled as part of their parent weekly goals
  }

  return false;
}
