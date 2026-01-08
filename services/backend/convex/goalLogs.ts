import { ConvexError, v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { requireLogin } from '../src/usecase/requireLogin';

/**
 * Type for goal log entries returned from queries.
 */
export type GoalLog = Doc<'goalLogs'>;

/**
 * Computes the root goal ID for a given goal.
 * If the goal was carried over, returns the rootGoalId from the carry-over chain.
 * Otherwise, returns the goal's own ID.
 *
 * @param goal - The goal document
 * @returns The root goal ID
 */
function getRootGoalId(goal: Doc<'goals'>): Id<'goals'> {
  return goal.carryOver?.fromGoal?.rootGoalId ?? goal._id;
}

/**
 * Creates a new goal log entry.
 *
 * The log is associated with both the current goal (goalId) and the root goal (rootGoalId).
 * This enables viewing logs for the current goal instance, or viewing the full log history
 * across all carried-over instances of the goal.
 *
 * @param ctx - Convex mutation context
 * @param args - Mutation arguments containing session, goal ID, date, and content
 * @returns Promise resolving to new log entry ID
 *
 * @example
 * ```typescript
 * const logId = await createGoalLog(ctx, {
 *   sessionId: "session123",
 *   goalId: "goal456",
 *   logDate: Date.now(),
 *   content: "<p>Made progress on the feature</p>"
 * });
 * ```
 */
export const createGoalLog = mutation({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    logDate: v.number(),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<Id<'goalLogs'>> => {
    const { sessionId, goalId, logDate, content } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Validate content
    if (!content.trim()) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Log content cannot be empty',
      });
    }

    // Verify the goal exists and belongs to the user
    const goal = await ctx.db.get('goals', goalId);
    if (!goal) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Goal not found',
      });
    }
    if (goal.userId !== userId) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to add logs to this goal',
      });
    }

    // Compute the root goal ID for consolidated log viewing
    const rootGoalId = getRootGoalId(goal);

    const now = Date.now();
    const logId = await ctx.db.insert('goalLogs', {
      userId,
      goalId,
      rootGoalId,
      logDate,
      content,
      createdAt: now,
    });

    return logId;
  },
});

/**
 * Updates an existing goal log entry.
 *
 * @param ctx - Convex mutation context
 * @param args - Mutation arguments containing session, log ID, and updated fields
 *
 * @example
 * ```typescript
 * await updateGoalLog(ctx, {
 *   sessionId: "session123",
 *   logId: "log456",
 *   content: "<p>Updated content</p>",
 *   logDate: Date.now()
 * });
 * ```
 */
export const updateGoalLog = mutation({
  args: {
    ...SessionIdArg,
    logId: v.id('goalLogs'),
    content: v.optional(v.string()),
    logDate: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    const { sessionId, logId, content, logDate } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Verify the log exists and belongs to the user
    const log = await ctx.db.get('goalLogs', logId);
    if (!log) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Log entry not found',
      });
    }
    if (log.userId !== userId) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this log entry',
      });
    }

    // Validate content if provided
    if (content !== undefined && !content.trim()) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Log content cannot be empty',
      });
    }

    const updates: Partial<Doc<'goalLogs'>> = {
      updatedAt: Date.now(),
    };

    if (content !== undefined) {
      updates.content = content;
    }
    if (logDate !== undefined) {
      updates.logDate = logDate;
    }

    await ctx.db.patch('goalLogs', logId, updates);
  },
});

/**
 * Deletes a goal log entry.
 *
 * @param ctx - Convex mutation context
 * @param args - Mutation arguments containing session and log ID
 *
 * @example
 * ```typescript
 * await deleteGoalLog(ctx, {
 *   sessionId: "session123",
 *   logId: "log456"
 * });
 * ```
 */
export const deleteGoalLog = mutation({
  args: {
    ...SessionIdArg,
    logId: v.id('goalLogs'),
  },
  handler: async (ctx, args): Promise<void> => {
    const { sessionId, logId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Verify the log exists and belongs to the user
    const log = await ctx.db.get('goalLogs', logId);
    if (!log) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Log entry not found',
      });
    }
    if (log.userId !== userId) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this log entry',
      });
    }

    await ctx.db.delete('goalLogs', logId);
  },
});

/**
 * Fetches all log entries for a specific goal, sorted by log date (most recent first).
 *
 * @param ctx - Convex query context
 * @param args - Query arguments containing session and goal ID
 * @returns Promise resolving to array of goal log entries
 *
 * @example
 * ```typescript
 * const logs = await getGoalLogs(ctx, {
 *   sessionId: "session123",
 *   goalId: "goal456"
 * });
 * ```
 */
export const getGoalLogs = query({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
  },
  handler: async (ctx, args): Promise<GoalLog[]> => {
    const { sessionId, goalId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Verify the goal exists and belongs to the user
    const goal = await ctx.db.get('goals', goalId);
    if (!goal) {
      return [];
    }
    if (goal.userId !== userId) {
      return [];
    }

    // Fetch logs using the index, sorted by date descending
    const logs = await ctx.db
      .query('goalLogs')
      .withIndex('by_goal_and_date', (q) => q.eq('goalId', goalId))
      .order('desc')
      .collect();

    return logs;
  },
});

/**
 * Fetches all log entries for a root goal (including all carried-over instances),
 * sorted by log date (most recent first).
 *
 * This enables viewing the full log history across all instances of a goal
 * that has been carried over multiple times.
 *
 * @param ctx - Convex query context
 * @param args - Query arguments containing session and root goal ID
 * @returns Promise resolving to array of goal log entries
 *
 * @example
 * ```typescript
 * const logs = await getGoalLogsByRootGoalId(ctx, {
 *   sessionId: "session123",
 *   rootGoalId: "goal456"
 * });
 * ```
 */
export const getGoalLogsByRootGoalId = query({
  args: {
    ...SessionIdArg,
    rootGoalId: v.id('goals'),
  },
  handler: async (ctx, args): Promise<GoalLog[]> => {
    const { sessionId, rootGoalId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Verify the root goal exists and belongs to the user
    const rootGoal = await ctx.db.get('goals', rootGoalId);
    if (!rootGoal) {
      return [];
    }
    if (rootGoal.userId !== userId) {
      return [];
    }

    // Fetch logs using the root goal index, sorted by date descending
    const logs = await ctx.db
      .query('goalLogs')
      .withIndex('by_root_goal_and_date', (q) => q.eq('rootGoalId', rootGoalId))
      .order('desc')
      .collect();

    return logs;
  },
});

/**
 * Gets the root goal ID for a given goal.
 * Useful for the frontend to determine the root goal ID for viewing full log history.
 *
 * @param ctx - Convex query context
 * @param args - Query arguments containing session and goal ID
 * @returns Promise resolving to the root goal ID
 */
export const getRootGoalIdForGoal = query({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
  },
  handler: async (ctx, args): Promise<Id<'goals'> | null> => {
    const { sessionId, goalId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const goal = await ctx.db.get('goals', goalId);
    if (!goal) {
      return null;
    }
    if (goal.userId !== userId) {
      return null;
    }

    return getRootGoalId(goal);
  },
});
