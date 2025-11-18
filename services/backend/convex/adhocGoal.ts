import { ConvexError, v } from 'convex/values';
import { DayOfWeek } from '../src/constants';
import { requireLogin } from '../src/usecase/requireLogin';
import { getISOWeekYear } from '../src/util/isoWeek';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

/**
 * Creates a new adhoc goal.
 *
 * @param ctx - Convex mutation context
 * @param args - Mutation arguments containing session and goal details
 * @returns Promise resolving to new goal ID
 *
 * @example
 * ```typescript
 * const goalId = await createAdhocGoal(ctx, {
 *   sessionId: "session123",
 *   title: "Fix leaky faucet",
 *   description: "Kitchen sink has been dripping",
 *   domainId: "domain456",
 *   weekNumber: 42,
 *   dayOfWeek: DayOfWeek.SATURDAY,
 *   dueDate: Date.now() + 86400000 // tomorrow
 * });
 * ```
 */
export const createAdhocGoal = mutation({
  args: {
    sessionId: v.id('sessions'),
    title: v.string(),
    details: v.optional(v.string()),
    domainId: v.optional(v.id('domains')),
    weekNumber: v.number(),
    dayOfWeek: v.optional(
      v.union(
        v.literal(DayOfWeek.MONDAY),
        v.literal(DayOfWeek.TUESDAY),
        v.literal(DayOfWeek.WEDNESDAY),
        v.literal(DayOfWeek.THURSDAY),
        v.literal(DayOfWeek.FRIDAY),
        v.literal(DayOfWeek.SATURDAY),
        v.literal(DayOfWeek.SUNDAY)
      )
    ),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<'goals'>> => {
    const { sessionId, title, details, domainId, weekNumber, dayOfWeek, dueDate } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Validate title
    if (!title.trim()) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Goal title cannot be empty',
      });
    }

    // Validate week number
    if (weekNumber < 1 || weekNumber > 53) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Week number must be between 1 and 53',
      });
    }

    // Validate domain if provided
    if (domainId) {
      const domain = await ctx.db.get(domainId);
      if (!domain || domain.userId !== userId) {
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: 'Domain not found or you do not have permission to use it',
        });
      }
    }

    // Get current year for ISO week calculation
    const now = new Date();
    const year = getISOWeekYear(now);

    // Create the adhoc goal
    const goalId = await ctx.db.insert('goals', {
      userId,
      year, // Use current year for partitioning
      quarter: Math.ceil((new Date().getMonth() + 1) / 3), // Current quarter
      title: title.trim(),
      details: details?.trim(),
      adhoc: {
        domainId: domainId || undefined,
        weekNumber,
        dayOfWeek,
        dueDate,
      },
      inPath: '/', // Adhoc goals don't use hierarchical paths
      depth: -1, // Special depth for adhoc goals
      isComplete: false,
    });

    // Create the adhoc goal state
    await ctx.db.insert('adhocGoalStates', {
      userId,
      goalId,
      year,
      weekNumber,
      dayOfWeek,
      isComplete: false,
    });

    return goalId;
  },
});

/**
 * Updates an existing adhoc goal.
 *
 * @param ctx - Convex mutation context
 * @param args - Mutation arguments containing session, goal ID, and updates
 * @returns Promise resolving when update is complete
 */
export const updateAdhocGoal = mutation({
  args: {
    sessionId: v.id('sessions'),
    goalId: v.id('goals'),
    title: v.optional(v.string()),
    details: v.optional(v.string()),
    domainId: v.optional(v.id('domains')),
    weekNumber: v.optional(v.number()),
    dayOfWeek: v.optional(
      v.union(
        v.literal(DayOfWeek.MONDAY),
        v.literal(DayOfWeek.TUESDAY),
        v.literal(DayOfWeek.WEDNESDAY),
        v.literal(DayOfWeek.THURSDAY),
        v.literal(DayOfWeek.FRIDAY),
        v.literal(DayOfWeek.SATURDAY),
        v.literal(DayOfWeek.SUNDAY)
      )
    ),
    dueDate: v.optional(v.number()),
    isComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<void> => {
    const {
      sessionId,
      goalId,
      title,
      details,
      domainId,
      weekNumber,
      dayOfWeek,
      dueDate,
      isComplete,
    } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find goal and verify ownership
    const goal = await ctx.db.get(goalId);
    if (!goal) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Goal not found',
      });
    }
    if (goal.userId !== userId || !goal.adhoc) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You do not have permission to update this goal',
      });
    }

    // Validate title if provided
    if (title !== undefined && !title.trim()) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Goal title cannot be empty',
      });
    }

    // Validate week number if provided
    if (weekNumber !== undefined && (weekNumber < 1 || weekNumber > 53)) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Week number must be between 1 and 53',
      });
    }

    // Validate domain if provided
    if (domainId !== undefined) {
      if (domainId === null) {
        // Allow setting to null (uncategorized)
      } else {
        const domain = await ctx.db.get(domainId);
        if (!domain || domain.userId !== userId) {
          throw new ConvexError({
            code: 'NOT_FOUND',
            message: 'Domain not found or you do not have permission to use it',
          });
        }
      }
    }

    // Prepare goal updates
    const goalUpdates: Partial<Doc<'goals'>> = {};
    if (title !== undefined) goalUpdates.title = title.trim();
    if (details !== undefined) goalUpdates.details = details?.trim();
    if (isComplete !== undefined) {
      goalUpdates.isComplete = isComplete;
      goalUpdates.completedAt = isComplete ? Date.now() : undefined;
    }

    // Update adhoc properties
    if (
      domainId !== undefined ||
      weekNumber !== undefined ||
      dayOfWeek !== undefined ||
      dueDate !== undefined
    ) {
      const currentAdhoc = goal.adhoc || {};
      const adhocUpdates = {
        domainId: domainId !== undefined ? domainId : currentAdhoc.domainId,
        weekNumber: weekNumber !== undefined ? weekNumber : currentAdhoc.weekNumber,
        dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : currentAdhoc.dayOfWeek,
        dueDate: dueDate !== undefined ? dueDate : currentAdhoc.dueDate,
      };
      goalUpdates.adhoc = adhocUpdates;
    }

    await ctx.db.patch(goalId, goalUpdates);

    // Update adhoc goal state if completion status changed
    if (isComplete !== undefined) {
      const existingState = await ctx.db
        .query('adhocGoalStates')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
        .first();

      if (existingState) {
        await ctx.db.patch(existingState._id, {
          isComplete,
          completedAt: isComplete ? Date.now() : undefined,
        });
      }
    }

    // Update week/day in adhoc goal state if changed
    if (weekNumber !== undefined || dayOfWeek !== undefined) {
      const existingState = await ctx.db
        .query('adhocGoalStates')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
        .first();

      if (existingState) {
        const stateUpdates: Partial<Doc<'adhocGoalStates'>> = {};
        if (weekNumber !== undefined) stateUpdates.weekNumber = weekNumber;
        if (dayOfWeek !== undefined) stateUpdates.dayOfWeek = dayOfWeek;

        await ctx.db.patch(existingState._id, stateUpdates);
      }
    }
  },
});

/**
 * Deletes an adhoc goal.
 *
 * @param ctx - Convex mutation context
 * @param args - Mutation arguments containing session and goal ID
 * @returns Promise resolving when deletion is complete
 */
export const deleteAdhocGoal = mutation({
  args: {
    sessionId: v.id('sessions'),
    goalId: v.id('goals'),
  },
  handler: async (ctx, args): Promise<void> => {
    const { sessionId, goalId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find goal and verify ownership
    const goal = await ctx.db.get(goalId);
    if (!goal) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Goal not found',
      });
    }
    if (goal.userId !== userId || !goal.adhoc) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You do not have permission to delete this goal',
      });
    }

    // Delete the adhoc goal state
    const goalStates = await ctx.db
      .query('adhocGoalStates')
      .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
      .collect();

    await Promise.all(goalStates.map((state) => ctx.db.delete(state._id)));

    // Delete the goal
    await ctx.db.delete(goalId);
  },
});

/**
 * Retrieves adhoc goals for a specific week.
 *
 * @param ctx - Convex query context
 * @param args - Query arguments containing session, year, and week number
 * @returns Promise resolving to array of adhoc goals with domain information
 */
export const getAdhocGoalsForWeek = query({
  args: {
    sessionId: v.id('sessions'),
    year: v.number(),
    weekNumber: v.number(),
  },
  handler: async (ctx, args): Promise<(Doc<'goals'> & { domain?: Doc<'domains'> })[]> => {
    const { sessionId, year, weekNumber } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get adhoc goal states for week
    const goalStates = await ctx.db
      .query('adhocGoalStates')
      .withIndex('by_user_and_year_and_week', (q) =>
        q.eq('userId', userId).eq('year', year).eq('weekNumber', weekNumber)
      )
      .collect();

    // Get corresponding goals
    const goalIds = goalStates.map((state) => state.goalId);
    const goals = await Promise.all(goalIds.map((id) => ctx.db.get(id)));

    // Filter out nulls and verify they are adhoc goals
    const adhocGoals = goals.filter(
      (goal): goal is Doc<'goals'> => goal !== null && goal.adhoc !== undefined
    );

    // Get domain information for goals that have domains
    const domainIds = [
      ...new Set(adhocGoals.map((goal) => goal.adhoc?.domainId).filter(Boolean) as Id<'domains'>[]),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get(id)));
    const domainMap = new Map(domains.filter(Boolean).map((domain) => [domain!._id, domain!]));

    // Combine goals with domain information
    return adhocGoals.map((goal) => ({
      ...goal,
      domain: goal.adhoc?.domainId ? domainMap.get(goal.adhoc.domainId) : undefined,
    }));
  },
});

/**
 * Retrieves adhoc goals for a specific day.
 *
 * @param ctx - Convex query context
 * @param args - Query arguments containing session, year, week number, and day of week
 * @returns Promise resolving to array of adhoc goals for specified day
 */
export const getAdhocGoalsForDay = query({
  args: {
    sessionId: v.id('sessions'),
    year: v.number(),
    weekNumber: v.number(),
    dayOfWeek: v.union(
      v.literal(DayOfWeek.MONDAY),
      v.literal(DayOfWeek.TUESDAY),
      v.literal(DayOfWeek.WEDNESDAY),
      v.literal(DayOfWeek.THURSDAY),
      v.literal(DayOfWeek.FRIDAY),
      v.literal(DayOfWeek.SATURDAY),
      v.literal(DayOfWeek.SUNDAY)
    ),
  },
  handler: async (ctx, args): Promise<(Doc<'goals'> & { domain?: Doc<'domains'> })[]> => {
    const { sessionId, year, weekNumber, dayOfWeek } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get adhoc goal states for specific day
    const goalStates = await ctx.db
      .query('adhocGoalStates')
      .withIndex('by_user_and_year_and_week_and_day', (q) =>
        q
          .eq('userId', userId)
          .eq('year', year)
          .eq('weekNumber', weekNumber)
          .eq('dayOfWeek', dayOfWeek)
      )
      .collect();

    // Get corresponding goals
    const goalIds = goalStates.map((state) => state.goalId);
    const goals = await Promise.all(goalIds.map((id) => ctx.db.get(id)));

    // Filter out nulls and verify they are adhoc goals
    const adhocGoals = goals.filter(
      (goal): goal is Doc<'goals'> => goal !== null && goal.adhoc !== undefined
    );

    // Get domain information for goals that have domains
    const domainIds = [
      ...new Set(adhocGoals.map((goal) => goal.adhoc?.domainId).filter(Boolean) as Id<'domains'>[]),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get(id)));
    const domainMap = new Map(domains.filter(Boolean).map((domain) => [domain!._id, domain!]));

    // Combine goals with domain information
    return adhocGoals.map((goal) => ({
      ...goal,
      domain: goal.adhoc?.domainId ? domainMap.get(goal.adhoc.domainId) : undefined,
    }));
  },
});

/**
 * Retrieves all adhoc goals for authenticated user.
 *
 * @param ctx - Convex query context
 * @param args - Query arguments containing session
 * @returns Promise resolving to array of all adhoc goals with domain information
 */
export const getAllAdhocGoals = query({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args): Promise<(Doc<'goals'> & { domain?: Doc<'domains'> })[]> => {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get all adhoc goals for user
    const adhocGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_adhoc', (q) => q.eq('userId', userId))
      .filter((q) => q.neq(q.field('adhoc'), undefined))
      .collect();

    // Get domain information for goals that have domains
    const domainIds = [
      ...new Set(adhocGoals.map((goal) => goal.adhoc?.domainId).filter(Boolean) as Id<'domains'>[]),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get(id)));
    const domainMap = new Map(domains.filter(Boolean).map((domain) => [domain!._id, domain!]));

    // Combine goals with domain information
    return adhocGoals.map((goal) => ({
      ...goal,
      domain: goal.adhoc?.domainId ? domainMap.get(goal.adhoc.domainId) : undefined,
    }));
  },
});
