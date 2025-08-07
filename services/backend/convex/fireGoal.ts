import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { mutation, query } from './_generated/server';
import { Id } from './_generated/dataModel';
import { requireLogin } from '../src/usecase/requireLogin';

/**
 * Toggles the fire status of a goal for the authenticated user.
 */
export const toggleFireStatus = mutation({
  args: {
    sessionId: v.id('sessions'),
    goalId: v.id('goals'),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

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

    const existingFireGoal = await ctx.db
      .query('fireGoals')
      .withIndex('by_user_and_goal', (q) =>
        q.eq('userId', userId).eq('goalId', goalId)
      )
      .first();

    if (existingFireGoal) {
      await ctx.db.delete(existingFireGoal._id);
      return false;
    } else {
      await ctx.db.insert('fireGoals', {
        userId,
        goalId,
        createdAt: Date.now(),
      });
      return true;
    }
  },
});

/**
 * Retrieves all fire goal IDs for the authenticated user.
 */
export const getFireGoals = query({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const fireGoals = await ctx.db
      .query('fireGoals')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    return fireGoals.map((fg) => fg.goalId);
  },
});


