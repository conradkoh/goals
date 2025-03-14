import { v } from 'convex/values';
import { internalMutation } from './_generated/server';

/**
 * Internal mutation to remove progress field from all goal states
 * This is meant to be run via the Convex console after making progress optional
 */
export const clearProgressField = internalMutation({
  handler: async (ctx) => {
    // Get all goal states
    const allGoalStates = await ctx.db.query('goalStateByWeek').collect();

    // Update each goal state to remove progress field
    let updatedCount = 0;

    // Process in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < allGoalStates.length; i += batchSize) {
      const batch = allGoalStates.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (goalState) => {
          // Create a new object without the progress field
          const { progress, ...restOfFields } = goalState;

          // Only update if progress field exists
          if (progress !== undefined) {
            // Replace the document with a version that doesn't have the progress field
            await ctx.db.replace(goalState._id, restOfFields);
            updatedCount++;
          }
        })
      );
    }

    return {
      message: `Successfully removed progress field from ${updatedCount} goal states`,
      totalRecords: allGoalStates.length,
      updatedRecords: updatedCount,
    };
  },
});
