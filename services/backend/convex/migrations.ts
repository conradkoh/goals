import { internalMutation } from './_generated/server';
import { Doc, Id } from './_generated/dataModel';

// Migration to move isComplete and completedAt from goalStateByWeek to goals
export const migrateCompletionStatusToGoals = internalMutation({
  handler: async (ctx) => {
    // Get all goals first
    const goals = await ctx.db.query('goals').collect();

    // Keep track of migration stats
    let totalGoals = goals.length;
    let updatedGoals = 0;

    for (const goal of goals) {
      // For each goal, find the most recent state in goalStateByWeek
      const states = await ctx.db
        .query('goalStateByWeek')
        .withIndex('by_user_and_goal', (q) =>
          q.eq('userId', goal.userId).eq('goalId', goal._id)
        )
        .collect();

      if (states.length === 0) {
        continue; // No states found for this goal
      }

      // Find the latest state based on weekNumber
      // This assumes higher weekNumber is more recent
      let latestState: Doc<'goalStateByWeek'> | null = null;
      for (const state of states) {
        if (!latestState || state.weekNumber > latestState.weekNumber) {
          latestState = state;
        }
      }

      if (latestState) {
        // Update the goal with the completion status from the latest state
        await ctx.db.patch(goal._id, {
          isComplete: latestState.isComplete,
          completedAt: latestState.completedAt,
        });
        updatedGoals++;
      }
    }

    return {
      totalGoals,
      updatedGoals,
      message: `Migrated completion status for ${updatedGoals} out of ${totalGoals} goals`,
    };
  },
});
