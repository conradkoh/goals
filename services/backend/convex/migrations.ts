import { internalMutation, internalAction } from './_generated/server';
import { Doc, Id } from './_generated/dataModel';
import { internal } from './_generated/api';

// Migration to move isComplete and completedAt from goalStateByWeek to goals
export const migrateCompletionStatusToGoals = internalMutation({
  handler: async (ctx) => {
    // Get all goals first
    const goals = await ctx.db.query('goals').collect();

    // Keep track of migration stats
    let totalGoals = goals.length;
    let updatedGoals = 0;

    for (const goal of goals) {
      // For each goal, find all states in goalStateByWeek
      const states = await ctx.db
        .query('goalStateByWeek')
        .withIndex('by_user_and_goal', (q) =>
          q.eq('userId', goal.userId).eq('goalId', goal._id)
        )
        .collect();

      if (states.length === 0) {
        continue; // No states found for this goal
      }

      // Filter states with defined isComplete values
      const statesWithCompletionStatus = states.filter(
        (state) => state.isComplete !== undefined
      );

      // Default values if no states have defined completion status
      let isComplete = false;
      let completedAt = undefined;

      if (statesWithCompletionStatus.length > 0) {
        // Find the latest state with a defined isComplete value
        let latestStateWithCompletion = statesWithCompletionStatus[0];

        for (const state of statesWithCompletionStatus) {
          if (state.weekNumber > latestStateWithCompletion.weekNumber) {
            latestStateWithCompletion = state;
          }
        }

        isComplete = latestStateWithCompletion.isComplete;
        completedAt = latestStateWithCompletion.completedAt;
      }

      // Update the goal with the determined completion status
      await ctx.db.patch(goal._id, {
        isComplete,
        completedAt,
      });
      updatedGoals++;
    }

    return {
      totalGoals,
      updatedGoals,
      message: `Migrated completion status for ${updatedGoals} out of ${totalGoals} goals`,
    };
  },
});

// Migration to clear isComplete and completedAt data from goalStateByWeek (batch processing)
export const clearCompletionStatusBatch = internalMutation({
  handler: async (ctx) => {
    // Get a batch of 100 goalStateByWeek records
    const states = await ctx.db.query('goalStateByWeek').take(1000);

    let processedCount = 0;

    // Process each record in the batch
    await Promise.all(
      states.map(async (state) => {
        // Now both fields are optional, so we can set them to undefined
        await ctx.db.patch(state._id, {
          isComplete: undefined,
          completedAt: undefined,
        });
        processedCount++;
      })
    );

    return {
      processedCount,
      hasMore: states.length === 1000, // If we got 100 records, there might be more
      message: `Cleared completion status data from ${processedCount} goalStateByWeek records`,
    };
  },
});

// Action to recursively trigger the batch mutation until all records are processed
export const runClearCompletionStatus = internalAction({
  handler: async (
    ctx
  ): Promise<{
    totalProcessed: number;
    batchResults: Array<{
      processedCount: number;
      hasMore: boolean;
      message: string;
    }>;
    message: string;
  }> => {
    let totalProcessed = 0;
    let hasMore = true;
    let batchResults: Array<{
      processedCount: number;
      hasMore: boolean;
      message: string;
    }> = [];

    while (hasMore) {
      const result = await ctx.runMutation(
        internal.migrations.clearCompletionStatusBatch
      );
      totalProcessed += result.processedCount;
      batchResults.push(result);

      // Check if we've processed all records
      hasMore = result.hasMore;
    }

    return {
      totalProcessed,
      batchResults,
      message: `Migration complete. Cleared completion status data from ${totalProcessed} goalStateByWeek records`,
    };
  },
});
