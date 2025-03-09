import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireLogin } from '../src/usecase/requireLogin';
import { Id } from './_generated/dataModel';
import { ConvexError } from 'convex/values';

export const toggleFireStatus = mutation({
  args: {
    sessionId: v.id('sessions'),
    goalId: v.id('goals'),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the goal and verify ownership
    const goal = await ctx.db.get(goalId);
    if (!goal) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Goal not found',
      });
    }
    if (goal.userId !== userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You do not have permission to update this goal',
      });
    }

    // Check if the goal is already on fire
    const existingFireGoal = await ctx.db
      .query('fireGoals')
      .withIndex('by_user_and_goal', (q) =>
        q.eq('userId', userId).eq('goalId', goalId)
      )
      .first();

    if (existingFireGoal) {
      // If it exists, remove it
      await ctx.db.delete(existingFireGoal._id);
      return false;
    } else {
      // If it doesn't exist, add it
      await ctx.db.insert('fireGoals', {
        userId,
        goalId,
        createdAt: Date.now(),
      });
      return true;
    }
  },
});

export const getFireGoals = query({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get all fire goals for the user
    const fireGoals = await ctx.db
      .query('fireGoals')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    // Return just the goalIds as an array
    return fireGoals.map((fg) => fg.goalId);
  },
});
