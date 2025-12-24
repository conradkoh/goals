import { ConvexError, v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';

import { DayOfWeek } from '../src/constants';
import type { Doc, Id } from './_generated/dataModel';
import { type MutationCtx, mutation, type QueryCtx, query } from './_generated/server';
import { requireLogin } from '../src/usecase/requireLogin';

/**
 * Maximum nesting depth for adhoc goals.
 * While the database supports infinite nesting, we soft-limit creation to 3 levels
 * to prevent overly complex hierarchies.
 */
const MAX_ADHOC_GOAL_DEPTH = 3;

/**
 * Calculates the nesting depth of an adhoc goal by traversing up the parent chain.
 *
 * @param ctx - Convex query or mutation context
 * @param goalId - The goal ID to calculate depth for
 * @returns Promise resolving to the depth (0 = root level, 1 = first child level, etc.)
 */
async function getAdhocGoalDepth(
  ctx: QueryCtx | MutationCtx,
  goalId: Id<'goals'>
): Promise<number> {
  let depth = 0;
  let currentGoal = await ctx.db.get('goals', goalId);

  while (currentGoal?.parentId) {
    depth++;
    currentGoal = await ctx.db.get('goals', currentGoal.parentId);
    // Safety check to prevent infinite loops in case of data corruption
    if (depth > 10) break;
  }

  return depth;
}

/**
 * Type for hierarchical adhoc goals with nested children.
 */
export type AdhocGoalWithChildren = Doc<'goals'> & {
  domain?: Doc<'domains'>;
  children: AdhocGoalWithChildren[];
};

/**
 * Builds a hierarchical structure from a flat list of adhoc goals.
 * Goals with parentId pointing to another goal in the list become children of that goal.
 *
 * @param goals - Flat list of adhoc goals with domain information
 * @returns Hierarchical array of root-level goals with nested children
 */
function buildAdhocGoalHierarchy(
  goals: (Doc<'goals'> & { domain?: Doc<'domains'> })[]
): AdhocGoalWithChildren[] {
  const goalMap = new Map<string, AdhocGoalWithChildren>();
  const rootGoals: AdhocGoalWithChildren[] = [];

  // First pass: create all nodes with empty children
  for (const goal of goals) {
    goalMap.set(goal._id, { ...goal, children: [] });
  }

  // Second pass: build parent-child relationships
  for (const goal of goals) {
    const node = goalMap.get(goal._id);
    if (!node) continue; // Should never happen, but type guard for safety

    if (goal.parentId && goalMap.has(goal.parentId)) {
      // Has a parent in this week's goals - add as child
      const parentNode = goalMap.get(goal.parentId);
      if (parentNode) {
        parentNode.children.push(node);
      }
    } else {
      // Root level goal (no parent or parent not in this week's data)
      rootGoals.push(node);
    }
  }

  return rootGoals;
}

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
    ...SessionIdArg,
    title: v.string(),
    details: v.optional(v.string()),
    domainId: v.optional(v.id('domains')),
    year: v.number(), // ISO week year
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
    parentId: v.optional(v.id('goals')), // Parent adhoc goal for nesting
  },
  handler: async (ctx, args): Promise<Id<'goals'>> => {
    const {
      sessionId,
      title,
      details,
      domainId,
      year: adhocYear,
      dayOfWeek: _dayOfWeek,
      dueDate,
      parentId,
    } = args;
    let { weekNumber } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Validate title
    if (!title.trim()) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Goal title cannot be empty',
      });
    }

    // Validate parent if provided and check nesting depth
    let effectiveDomainId = domainId;
    if (parentId) {
      const parent = await ctx.db.get('goals', parentId);
      if (!parent || parent.userId !== userId || !parent.adhoc) {
        throw new ConvexError({
          code: 'INVALID_ARGUMENT',
          message: 'Parent goal not found or is not an adhoc goal',
        });
      }

      // Check nesting depth (soft limit at MAX_ADHOC_GOAL_DEPTH levels)
      const parentDepth = await getAdhocGoalDepth(ctx, parentId);
      if (parentDepth >= MAX_ADHOC_GOAL_DEPTH) {
        throw new ConvexError({
          code: 'INVALID_ARGUMENT',
          message: `Maximum nesting depth (${MAX_ADHOC_GOAL_DEPTH} levels) exceeded`,
        });
      }

      // Inherit week from parent
      weekNumber = parent.adhoc.weekNumber;

      // Inherit domain from parent if not specified
      if (!effectiveDomainId && parent.domainId) {
        effectiveDomainId = parent.domainId;
      }
    }

    // Validate week number
    if (weekNumber < 1 || weekNumber > 53) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Week number must be between 1 and 53',
      });
    }

    // Validate domain if provided
    if (effectiveDomainId) {
      const domain = await ctx.db.get('domains', effectiveDomainId);
      if (!domain || domain.userId !== userId) {
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: 'Domain not found or you do not have permission to use it',
        });
      }
    }

    // adhocYear is provided directly from args

    // Create the adhoc goal
    const goalId = await ctx.db.insert('goals', {
      userId,
      year: adhocYear, // Use adhoc year for partitioning
      quarter: Math.ceil((new Date().getMonth() + 1) / 3), // Current quarter (used for general partitioning)
      title: title.trim(),
      details: details?.trim(),
      domainId: effectiveDomainId || undefined, // Store domain at goal level
      parentId: parentId || undefined, // Store parent reference for nesting
      adhoc: {
        weekNumber,
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
    ...SessionIdArg,
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
      dayOfWeek: _dayOfWeek,
      dueDate,
      isComplete,
    } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find goal and verify ownership
    const goal = await ctx.db.get('goals', goalId);
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
        const domain = await ctx.db.get('domains', domainId);
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
        // domainId removed - use goal.domainId instead
        weekNumber: weekNumber !== undefined ? weekNumber : currentAdhoc.weekNumber,
        // dayOfWeek: removed - adhoc tasks are week-level only
        dueDate: dueDate !== undefined ? dueDate : currentAdhoc.dueDate,
      };
      goalUpdates.adhoc = adhocUpdates;
    }

    await ctx.db.patch('goals', goalId, goalUpdates);

    // Update adhoc goal state if completion status changed
    if (isComplete !== undefined) {
      const existingState = await ctx.db
        .query('adhocGoalStates')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
        .first();

      if (existingState) {
        await ctx.db.patch('adhocGoalStates', existingState._id, {
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
          await ctx.db.delete('fireGoals', existingFireGoal._id);
        }
      }
    }

    // Update week in adhoc goal state if changed
    if (weekNumber !== undefined) {
      const existingState = await ctx.db
        .query('adhocGoalStates')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
        .first();

      if (existingState) {
        const stateUpdates: Partial<Doc<'adhocGoalStates'>> = {};
        if (weekNumber !== undefined) stateUpdates.weekNumber = weekNumber;
        // dayOfWeek removed - adhoc tasks are week-level only

        await ctx.db.patch('adhocGoalStates', existingState._id, stateUpdates);
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
    ...SessionIdArg,
    goalId: v.id('goals'),
  },
  handler: async (ctx, args): Promise<void> => {
    const { sessionId, goalId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find goal and verify ownership
    const goal = await ctx.db.get('goals', goalId);
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

    await Promise.all(goalStates.map((state) => ctx.db.delete('adhocGoalStates', state._id)));

    // Delete the goal
    await ctx.db.delete('goals', goalId);
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
    ...SessionIdArg,
    year: v.number(),
    weekNumber: v.number(),
  },
  handler: async (ctx, args): Promise<AdhocGoalWithChildren[]> => {
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
    // Read from goal.domainId (stored at root level)
    const domainIds = [
      ...new Set(adhocGoals.map((goal) => goal.domainId).filter(Boolean) as Id<'domains'>[]),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get('domains', id)));
    const domainMap = new Map(
      domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
    );

    // Combine goals with domain information
    const goalsWithDomains = adhocGoals.map((goal) => {
      const effectiveDomainId = goal.domainId;
      return {
        ...goal,
        domain: effectiveDomainId ? domainMap.get(effectiveDomainId) : undefined,
      };
    });

    // Build and return hierarchical structure
    return buildAdhocGoalHierarchy(goalsWithDomains);
  },
});

/**
 * Retrieves adhoc goals for a specific week as a flat list (for backward compatibility).
 */
export const getAdhocGoalsForWeekFlat = query({
  args: {
    ...SessionIdArg,
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
    const domainIds = [
      ...new Set(adhocGoals.map((goal) => goal.domainId).filter(Boolean) as Id<'domains'>[]),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get('domains', id)));
    const domainMap = new Map(
      domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
    );

    // Combine goals with domain information (flat list)
    return adhocGoals.map((goal) => {
      const effectiveDomainId = goal.domainId;
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
    ...SessionIdArg,
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
    const { sessionId, year, weekNumber } = args;
    // dayOfWeek parameter is kept for backward compatibility but ignored
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Query all adhoc goals for the week (no day filtering - adhoc tasks are week-level only)
    const adhocGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_adhoc_year_week', (q) =>
        q.eq('userId', userId).eq('year', year).eq('adhoc.weekNumber', weekNumber)
      )
      .collect();

    // Get domain information for goals that have domains
    // Read from goal.domainId (stored at root level)
    const domainIds = [
      ...new Set(adhocGoals.map((goal) => goal.domainId).filter(Boolean) as Id<'domains'>[]),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get('domains', id)));
    const domainMap = new Map(
      domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
    );

    // Combine goals with domain information
    return adhocGoals.map((goal) => {
      const effectiveDomainId = goal.domainId;
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
    ...SessionIdArg,
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
    // Read from goal.domainId (stored at root level)
    const domainIds = [
      ...new Set(adhocGoals.map((goal) => goal.domainId).filter(Boolean) as Id<'domains'>[]),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get('domains', id)));
    const domainMap = new Map(
      domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
    );

    // Combine goals with domain information
    return adhocGoals.map((goal) => {
      const effectiveDomainId = goal.domainId;
      return {
        ...goal,
        domain: effectiveDomainId ? domainMap.get(effectiveDomainId) : undefined,
      };
    });
  },
});

/**
 * Retrieves adhoc goals filtered by domain.
 *
 * @param ctx - Convex query context
 * @param args - Query arguments containing session and domain ID (null for uncategorized)
 * @returns Promise resolving to array of adhoc goals with domain information
 */
export const getAdhocGoalsByDomain = query({
  args: {
    ...SessionIdArg,
    domainId: v.union(v.id('domains'), v.null()),
  },
  handler: async (ctx, args): Promise<(Doc<'goals'> & { domain?: Doc<'domains'> })[]> => {
    const { sessionId, domainId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get all goals for user and filter for adhoc goals
    const allGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) => q.eq('userId', userId))
      .collect();

    // Filter for adhoc goals matching the domain
    const adhocGoals = allGoals.filter((goal) => {
      if (!goal.adhoc) return false;
      const effectiveDomainId = goal.domainId;
      if (domainId === null) {
        // Return uncategorized goals (no domain)
        return !effectiveDomainId;
      }
      // Return goals matching the specified domain
      return effectiveDomainId === domainId;
    });

    // Get domain information for goals that have domains
    const domainIds = [
      ...new Set(adhocGoals.map((goal) => goal.domainId).filter(Boolean) as Id<'domains'>[]),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get('domains', id)));
    const domainMap = new Map(
      domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
    );

    // Combine goals with domain information
    return adhocGoals.map((goal) => {
      const effectiveDomainId = goal.domainId;
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
    ...SessionIdArg,
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
      ...new Set(incompleteGoals.map((goal) => goal.domainId).filter(Boolean) as Id<'domains'>[]),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get('domains', id)));
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
          const effectiveDomainId = goal.domainId;
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

        await ctx.db.patch('goals', goal._id, {
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
          await ctx.db.patch('adhocGoalStates', state._id, {
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
    ...SessionIdArg,
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

    // Since adhoc tasks are week-level only, just use all incomplete goals for the week
    // dayOfWeek parameter is kept for backward compatibility but ignored
    const incompleteGoals = weekGoals;

    // Get domain information for preview
    // Read from goal.domainId with fallback to goal.adhoc.domainId
    const domainIds = [
      ...new Set(incompleteGoals.map((goal) => goal.domainId).filter(Boolean) as Id<'domains'>[]),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get('domains', id)));
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
          const effectiveDomainId = goal.domainId;
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

        await ctx.db.patch('goals', goal._id, {
          year: to.year, // Update root year field
          adhoc: {
            ...goal.adhoc,
            weekNumber: to.weekNumber,
            // dayOfWeek removed - adhoc tasks are week-level only
          },
        });

        // Update adhoc goal state
        const state = await ctx.db
          .query('adhocGoalStates')
          .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goal._id))
          .first();

        if (state) {
          await ctx.db.patch('adhocGoalStates', state._id, {
            year: to.year,
            weekNumber: to.weekNumber,
            // dayOfWeek removed - adhoc tasks are week-level only
          });
        }
      })
    );

    return {
      goalsMoved: incompleteGoals.length,
    };
  },
});
