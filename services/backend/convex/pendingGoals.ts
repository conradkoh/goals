import { ConvexError, v } from 'convex/values';
import { requireLogin } from '../src/usecase/requireLogin';
import { mutation, query } from './_generated/server';

/**
 * Sets or updates the pending status description for a goal.
 */
export const setPendingStatus = mutation({
  args: {
    sessionId: v.id('sessions'),
    goalId: v.id('goals'),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId, description } = args;
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

    const existingPending = await ctx.db
      .query('pendingGoals')
      .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
      .first();

    if (existingPending) {
      await ctx.db.patch(existingPending._id, {
        description,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert('pendingGoals', {
        userId,
        goalId,
        description,
        createdAt: Date.now(),
      });
    }

    // Simple invariant: when a goal is marked pending, ensure it is not on fire
    const existingFireGoal = await ctx.db
      .query('fireGoals')
      .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
      .first();
    if (existingFireGoal) {
      await ctx.db.delete(existingFireGoal._id);
    }

    return true;
  },
});

/**
 * Clears the pending status for a goal by removing its pending entry.
 */
export const clearPendingStatus = mutation({
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

    const existingPending = await ctx.db
      .query('pendingGoals')
      .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
      .first();

    if (existingPending) {
      await ctx.db.delete(existingPending._id);
    }

    // Simple behavior: when pending is cleared, tag the goal as on fire again
    const existingFireGoal = await ctx.db
      .query('fireGoals')
      .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
      .first();
    if (!existingFireGoal) {
      await ctx.db.insert('fireGoals', {
        userId,
        goalId,
        createdAt: Date.now(),
      });
    }

    return true;
  },
});

/**
 * Retrieves all pending goals with their descriptions for the authenticated user.
 */
export const getPendingGoals = query({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const pendingGoals = await ctx.db
      .query('pendingGoals')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    return pendingGoals.map((pg) => ({
      goalId: pg.goalId,
      description: pg.description,
    }));
  },
});
