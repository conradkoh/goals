import { ConvexError, v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';

import { mutation, query } from './_generated/server';
import { requireLogin } from '../src/usecase/requireLogin';

/**
 * Toggles the fire status of a goal for the authenticated user.
 */
export const toggleFireStatus = mutation({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const goal = await ctx.db.get('goals', goalId);
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
      .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
      .first();

    if (existingFireGoal) {
      await ctx.db.delete('fireGoals', existingFireGoal._id);
      return false;
    }
    await ctx.db.insert('fireGoals', {
      userId,
      goalId,
      createdAt: Date.now(),
    });

    // Business rule: If marking an adhoc backlog goal as fire, auto-activate it
    // Fire goals need immediate attention - contradicts backlog intent
    if (goal.adhoc && goal.isBacklog) {
      await ctx.db.patch('goals', goalId, { isBacklog: false });
    }

    return true;
  },
});

/**
 * Retrieves all fire goal IDs for the authenticated user.
 */
export const getFireGoals = query({
  args: {
    ...SessionIdArg,
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

/**
 * Returns on-fire goals with basic data needed to render a flat list and open a detail panel.
 */
export const getFireGoalDetails = query({
  args: { ...SessionIdArg },
  handler: async (ctx, args) => {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get all fire goal IDs for this user
    const fireGoals = await ctx.db
      .query('fireGoals')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    if (fireGoals.length === 0) return [];

    // Fetch each goal's data
    const goals = await Promise.all(
      fireGoals.map(async (fg) => {
        const goal = await ctx.db.get('goals', fg.goalId);
        return goal ? { ...goal, fireGoalId: fg._id } : null;
      })
    );

    // Return only valid goals with relevant fields
    return goals
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .map((g) => ({
        _id: g._id,
        title: g.title,
        isComplete: g.isComplete ?? false,
        year: g.year,
        quarter: g.quarter,
        weekNumber: g.adhoc?.weekNumber ?? null,
        depth: g.depth, // 0=quarterly, 1=weekly, 2=daily
        isAdhoc: Boolean(g.adhoc),
      }));
  },
});
