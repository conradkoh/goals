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

    // Calculate the ISO week year for the given week number
    // We need to determine which year this week number belongs to
    const now = new Date();
    const currentYear = getISOWeekYear(now);
    const currentWeekNumber =
      Math.floor(
        (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
      ) + 1;

    // If the week number is much higher than current week and we're early in the year,
    // it's likely from the previous year (e.g., week 52 in January)
    // If the week number is much lower than current week and we're late in the year,
    // it's likely from the next year (e.g., week 1 in December)
    let adhocYear = currentYear;
    if (weekNumber > 50 && currentWeekNumber < 10) {
      // Week 51-53 when we're in weeks 1-9 means it's from previous year
      adhocYear = currentYear - 1;
    } else if (weekNumber < 10 && currentWeekNumber > 50) {
      // Week 1-9 when we're in weeks 51-53 means it's from next year
      adhocYear = currentYear + 1;
    }

    // Create the adhoc goal
    const goalId = await ctx.db.insert('goals', {
      userId,
      year: adhocYear, // Use adhoc year for partitioning
      quarter: Math.ceil((new Date().getMonth() + 1) / 3), // Current quarter (used for general partitioning)
      title: title.trim(),
      details: details?.trim(),
      domainId: domainId || undefined, // Store domain at goal level
      adhoc: {
        domainId: domainId || undefined, // Keep for backward compatibility
        weekNumber,
        // dayOfWeek: removed - adhoc tasks are week-level only
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
      year: adhocYear,
      weekNumber,
      // dayOfWeek: removed - adhoc tasks are week-level only
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
    domainId: v.optional(v.union(v.id('domains'), v.null())),
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
    if (domainId !== undefined) {
      // Update domain at goal level
      goalUpdates.domainId = domainId === null ? undefined : domainId;
    }
    if (isComplete !== undefined) {
      goalUpdates.isComplete = isComplete;
      goalUpdates.completedAt = isComplete ? Date.now() : undefined;
    }

    // Update adhoc properties
    if (
      domainId !== undefined ||
      weekNumber !== undefined ||
      // dayOfWeek removed - ignored parameter
      dueDate !== undefined
    ) {
      const currentAdhoc = goal.adhoc || {};
      const adhocUpdates = {
        domainId:
          domainId !== undefined
            ? domainId === null
              ? undefined
              : domainId
            : currentAdhoc.domainId, // Keep for backward compatibility
        weekNumber: weekNumber !== undefined ? weekNumber : currentAdhoc.weekNumber,
        // dayOfWeek: removed - adhoc tasks are week-level only
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

      // Remove from fire goals when marked complete
      if (isComplete) {
        const existingFireGoal = await ctx.db
          .query('fireGoals')
          .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
          .first();
        if (existingFireGoal) {
          await ctx.db.delete(existingFireGoal._id);
        }
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

    // Query goals directly using the adhoc index
    const adhocGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_adhoc_year_week', (q) =>
        q.eq('userId', userId).eq('year', year).eq('adhoc.weekNumber', weekNumber)
      )
      .collect();

    // Get domain information for goals that have domains
    // Read from goal.domainId with fallback to goal.adhoc.domainId
    const domainIds = [
      ...new Set(
        adhocGoals
          .map((goal) => goal.domainId || goal.adhoc?.domainId)
          .filter(Boolean) as Id<'domains'>[]
      ),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get(id)));
    const domainMap = new Map(
      domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
    );

    // Combine goals with domain information
    return adhocGoals.map((goal) => {
      const effectiveDomainId = goal.domainId || goal.adhoc?.domainId;
      return {
        ...goal,
        domain: effectiveDomainId ? domainMap.get(effectiveDomainId) : undefined,
      };
    });
  },
});

/**
 * Retrieves adhoc goals for a specific day.
 *
 * @param ctx - Convex query context
 * @param args - Query arguments containing session, year, week number, and day of week
 * @returns Promise resolving to array of adhoc goals for specified day (includes week goals without specific day)
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

    // Query goals for the week, then filter for specific day or no day
    const weekGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_adhoc_year_week', (q) =>
        q.eq('userId', userId).eq('year', year).eq('adhoc.weekNumber', weekNumber)
      )
      .collect();

    // Filter for goals assigned to this day OR goals with no specific day
    const adhocGoals = weekGoals.filter(
      (goal) => goal.adhoc?.dayOfWeek === dayOfWeek || !goal.adhoc?.dayOfWeek
    );

    // Get domain information for goals that have domains
    // Read from goal.domainId with fallback to goal.adhoc.domainId
    const domainIds = [
      ...new Set(
        adhocGoals
          .map((goal) => goal.domainId || goal.adhoc?.domainId)
          .filter(Boolean) as Id<'domains'>[]
      ),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get(id)));
    const domainMap = new Map(
      domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
    );

    // Combine goals with domain information
    return adhocGoals.map((goal) => {
      const effectiveDomainId = goal.domainId || goal.adhoc?.domainId;
      return {
        ...goal,
        domain: effectiveDomainId ? domainMap.get(effectiveDomainId) : undefined,
      };
    });
  },
});

/**
 * Retrieves all adhoc goals for authenticated user.
 * Note: This query is less efficient for large datasets. Consider using getAdhocGoalsForWeek instead.
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

    // Get all goals for user and filter for adhoc goals
    // Note: This is less efficient than querying by week; consider paginating or filtering by year
    const allGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) => q.eq('userId', userId))
      .collect();

    const adhocGoals = allGoals.filter((goal) => goal.adhoc !== undefined);

    // Get domain information for goals that have domains
    // Read from goal.domainId with fallback to goal.adhoc.domainId
    const domainIds = [
      ...new Set(
        adhocGoals
          .map((goal) => goal.domainId || goal.adhoc?.domainId)
          .filter(Boolean) as Id<'domains'>[]
      ),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get(id)));
    const domainMap = new Map(
      domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
    );

    // Combine goals with domain information
    return adhocGoals.map((goal) => {
      const effectiveDomainId = goal.domainId || goal.adhoc?.domainId;
      return {
        ...goal,
        domain: effectiveDomainId ? domainMap.get(effectiveDomainId) : undefined,
      };
    });
  },
});

/**
 * Moves incomplete adhoc goals from a previous week to a target week.
 *
 * @param ctx - Convex mutation context
 * @param args - Mutation arguments containing session, source week, target week, and dry-run flag
 * @returns Promise resolving to preview data (if dry-run) or result with count of moved goals
 *
 * @example
 * ```typescript
 * // Preview what would be moved
 * const preview = await moveAdhocGoalsFromWeek(ctx, {
 *   sessionId: "session123",
 *   from: { year: 2024, weekNumber: 46 },
 *   to: { year: 2024, weekNumber: 47 },
 *   dryRun: true
 * });
 *
 * // Actually move the goals
 * const result = await moveAdhocGoalsFromWeek(ctx, {
 *   sessionId: "session123",
 *   from: { year: 2024, weekNumber: 46 },
 *   to: { year: 2024, weekNumber: 47 },
 *   dryRun: false
 * });
 * ```
 */
export const moveAdhocGoalsFromWeek = mutation({
  args: {
    sessionId: v.id('sessions'),
    from: v.object({
      year: v.number(),
      weekNumber: v.number(),
    }),
    to: v.object({
      year: v.number(),
      weekNumber: v.number(),
    }),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { sessionId, from, to, dryRun = false } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get all incomplete adhoc goals from the source week
    const incompleteGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_adhoc_year_week', (q) =>
        q.eq('userId', userId).eq('year', from.year).eq('adhoc.weekNumber', from.weekNumber)
      )
      .filter((q) => q.eq(q.field('isComplete'), false))
      .collect();

    // Get domain information for preview
    // Read from goal.domainId with fallback to goal.adhoc.domainId
    const domainIds = [
      ...new Set(
        incompleteGoals
          .map((goal) => goal.domainId || goal.adhoc?.domainId)
          .filter(Boolean) as Id<'domains'>[]
      ),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get(id)));
    const domainMap = new Map(
      domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
    );

    // If dry-run, return preview data
    if (dryRun) {
      return {
        canMove: incompleteGoals.length > 0,
        from: { year: from.year, weekNumber: from.weekNumber },
        to: { year: to.year, weekNumber: to.weekNumber },
        goals: incompleteGoals.map((goal) => {
          const effectiveDomainId = goal.domainId || goal.adhoc?.domainId;
          return {
            ...goal,
            domain: effectiveDomainId ? domainMap.get(effectiveDomainId) : undefined,
          };
        }),
      };
    }

    // Update each incomplete goal to the target week
    await Promise.all(
      incompleteGoals.map(async (goal) => {
        if (!goal.adhoc) return;

        await ctx.db.patch(goal._id, {
          year: to.year, // Update root year field
          adhoc: {
            ...goal.adhoc,
            weekNumber: to.weekNumber,
          },
        });

        // Update adhoc goal state
        const state = await ctx.db
          .query('adhocGoalStates')
          .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goal._id))
          .first();

        if (state) {
          await ctx.db.patch(state._id, {
            year: to.year,
            weekNumber: to.weekNumber,
          });
        }
      })
    );

    return {
      goalsMoved: incompleteGoals.length,
    };
  },
});

/**
 * Moves incomplete adhoc goals from a previous day to a target day.
 * Only moves goals that have a specific dayOfWeek set.
 *
 * @param ctx - Convex mutation context
 * @param args - Mutation arguments containing session, source day, target day, and dry-run flag
 * @returns Promise resolving to preview data (if dry-run) or result with count of moved goals
 *
 * @example
 * ```typescript
 * // Preview what would be moved
 * const preview = await moveAdhocGoalsFromDay(ctx, {
 *   sessionId: "session123",
 *   from: { year: 2024, weekNumber: 47, dayOfWeek: DayOfWeek.MONDAY },
 *   to: { year: 2024, weekNumber: 47, dayOfWeek: DayOfWeek.TUESDAY },
 *   dryRun: true
 * });
 *
 * // Actually move the goals
 * const result = await moveAdhocGoalsFromDay(ctx, {
 *   sessionId: "session123",
 *   from: { year: 2024, weekNumber: 47, dayOfWeek: DayOfWeek.MONDAY },
 *   to: { year: 2024, weekNumber: 47, dayOfWeek: DayOfWeek.TUESDAY },
 *   dryRun: false
 * });
 * ```
 */
export const moveAdhocGoalsFromDay = mutation({
  args: {
    sessionId: v.id('sessions'),
    from: v.object({
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
    }),
    to: v.object({
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
    }),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { sessionId, from, to, dryRun = false } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get all incomplete adhoc goals from the source week that match the specific day
    const weekGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_adhoc_year_week', (q) =>
        q.eq('userId', userId).eq('year', from.year).eq('adhoc.weekNumber', from.weekNumber)
      )
      .filter((q) => q.eq(q.field('isComplete'), false))
      .collect();

    // Filter for goals that have the specific dayOfWeek set (not week-level goals)
    const incompleteGoals = weekGoals.filter((goal) => goal.adhoc?.dayOfWeek === from.dayOfWeek);

    // Get domain information for preview
    // Read from goal.domainId with fallback to goal.adhoc.domainId
    const domainIds = [
      ...new Set(
        incompleteGoals
          .map((goal) => goal.domainId || goal.adhoc?.domainId)
          .filter(Boolean) as Id<'domains'>[]
      ),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get(id)));
    const domainMap = new Map(
      domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
    );

    // If dry-run, return preview data
    if (dryRun) {
      return {
        canMove: incompleteGoals.length > 0,
        from: { year: from.year, weekNumber: from.weekNumber, dayOfWeek: from.dayOfWeek },
        to: { year: to.year, weekNumber: to.weekNumber, dayOfWeek: to.dayOfWeek },
        goals: incompleteGoals.map((goal) => {
          const effectiveDomainId = goal.domainId || goal.adhoc?.domainId;
          return {
            ...goal,
            domain: effectiveDomainId ? domainMap.get(effectiveDomainId) : undefined,
          };
        }),
      };
    }

    // Update each incomplete goal to the target day
    await Promise.all(
      incompleteGoals.map(async (goal) => {
        if (!goal.adhoc) return;

        await ctx.db.patch(goal._id, {
          year: to.year, // Update root year field
          adhoc: {
            ...goal.adhoc,
            weekNumber: to.weekNumber,
            dayOfWeek: to.dayOfWeek,
          },
        });

        // Update adhoc goal state
        const state = await ctx.db
          .query('adhocGoalStates')
          .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goal._id))
          .first();

        if (state) {
          await ctx.db.patch(state._id, {
            year: to.year,
            weekNumber: to.weekNumber,
            dayOfWeek: to.dayOfWeek,
          });
        }
      })
    );

    return {
      goalsMoved: incompleteGoals.length,
    };
  },
});
