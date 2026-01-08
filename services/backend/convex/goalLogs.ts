import { ConvexError, v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { requireLogin } from '../src/usecase/requireLogin';
import { getRootGoalId } from '../src/util/goalUtils';

/**
 * Type for goal log entries returned from queries.
 */
export type GoalLog = Doc<'goalLogs'>;

/**
 * Maximum content length for goal logs (50KB)
 */
const MAX_CONTENT_LENGTH = 50000;

/**
 * Validates HTML content to ensure it's not empty after stripping tags.
 * Matches the frontend isHTMLEmpty validation logic.
 *
 * @param content - HTML content string
 * @returns True if content is effectively empty
 */
function isHTMLEmpty(content: string): boolean {
  // Remove HTML tags and check if remaining text is empty
  const plainText = content.replace(/<[^>]*>/g, '').trim();
  return plainText.length === 0;
}

/**
 * Validates a log date timestamp.
 *
 * @param logDate - Unix timestamp to validate
 * @throws ConvexError if date is invalid
 */
function validateLogDate(logDate: number): void {
  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
  const oneDayInFuture = now + 24 * 60 * 60 * 1000;

  if (logDate < oneYearAgo) {
    throw new ConvexError({
      code: 'INVALID_ARGUMENT',
      message: 'Log date cannot be more than one year in the past',
    });
  }

  if (logDate > oneDayInFuture) {
    throw new ConvexError({
      code: 'INVALID_ARGUMENT',
      message: 'Log date cannot be in the future',
    });
  }

  if (!Number.isFinite(logDate) || logDate < 0) {
    throw new ConvexError({
      code: 'INVALID_ARGUMENT',
      message: 'Log date must be a valid timestamp',
    });
  }
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
    if (isHTMLEmpty(content)) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Log content cannot be empty',
      });
    }

    // Validate content length
    if (content.length > MAX_CONTENT_LENGTH) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: `Log content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
      });
    }

    // Validate log date
    validateLogDate(logDate);

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
    if (content !== undefined) {
      if (isHTMLEmpty(content)) {
        throw new ConvexError({
          code: 'INVALID_ARGUMENT',
          message: 'Log content cannot be empty',
        });
      }

      if (content.length > MAX_CONTENT_LENGTH) {
        throw new ConvexError({
          code: 'INVALID_ARGUMENT',
          message: `Log content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
        });
      }
    }

    // Validate log date if provided
    if (logDate !== undefined) {
      validateLogDate(logDate);
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
 * @returns Promise resolving to the root goal ID or undefined if not found
 */
export const getRootGoalIdForGoal = query({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
  },
  handler: async (ctx, args): Promise<Id<'goals'> | undefined> => {
    const { sessionId, goalId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const goal = await ctx.db.get('goals', goalId);
    if (!goal) {
      return undefined;
    }
    if (goal.userId !== userId) {
      return undefined;
    }

    return getRootGoalId(goal);
  },
});
