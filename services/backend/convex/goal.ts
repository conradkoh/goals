import { ConvexError, v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';

import { DayOfWeek, getDayName } from '../src/constants';
import { api, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server';
import {
  createGoalState,
  createGoalWithCarryOver,
  deduplicateByRootGoalId,
  GoalDepth,
} from '../src/usecase/goal';
import {
  buildExistingGoalsMap,
  findMaxWeekForQuarterlyGoal,
} from '../src/usecase/moveGoalsFromQuarter';
import {
  moveGoalsFromLastNonEmptyWeekUsecase,
  moveGoalsFromWeekUsecase,
} from '../src/usecase/moveGoalsFromWeek/moveGoalsFromWeek';
import {
  getFinalWeeksOfQuarter,
  getFirstWeekOfQuarter,
  getQuarterWeeks,
} from '../src/usecase/quarter';
import { requireLogin } from '../src/usecase/requireLogin';
import { getNextPath, joinPath, validateGoalPath } from '../src/util/path';

export const moveGoalsFromWeek = mutation({
  args: {
    ...SessionIdArg,
    from: v.object({
      year: v.number(),
      quarter: v.number(),
      weekNumber: v.number(),
    }),
    to: v.object({
      year: v.number(),
      quarter: v.number(),
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
    }),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { sessionId, from, to, dryRun } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const result = await moveGoalsFromWeekUsecase(ctx, {
      userId,
      from,
      to,
      dryRun: dryRun ?? false,
    });

    return result;
  },
});

export const moveGoalsFromLastNonEmptyWeek = mutation({
  args: {
    ...SessionIdArg,
    to: v.object({
      year: v.number(),
      quarter: v.number(),
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
    }),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { sessionId, to, dryRun } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const result = await moveGoalsFromLastNonEmptyWeekUsecase(ctx, {
      userId,
      from: to, // This parameter will be ignored since we find the source week dynamically
      to,
      dryRun: dryRun ?? false,
    });

    return result;
  },
});

/**
 * Represents a week option available for goal movement within a quarter.
 * Used by the frontend to display week selection options in the move modal.
 */
export type WeekOption = {
  /** The year of the week */
  year: number;
  /** The quarter number (1-4) */
  quarter: number;
  /** The week number within the quarter */
  weekNumber: number;
  /** Human-readable label for display (e.g., "Week 42 (next)") */
  label: string;
};

/**
 * Retrieves all available weeks in the current quarter for goal movement.
 * Weeks are labeled with context indicators (current, next, past) based on the provided current week.
 *
 * @param ctx - Convex query context
 * @param args - Query arguments containing session and current week information
 * @returns Promise resolving to array of week options with labels
 *
 * @example
 * ```typescript
 * const weeks = await getAvailableWeeks(ctx, {
 *   sessionId: "session123",
 *   currentWeek: { year: 2024, quarter: 3, weekNumber: 42 }
 * });
 * // Returns: [
 * //   { year: 2024, quarter: 3, weekNumber: 41, label: "Week 41 (past)" },
 * //   { year: 2024, quarter: 3, weekNumber: 42, label: "Week 42 (current)" },
 * //   { year: 2024, quarter: 3, weekNumber: 43, label: "Week 43 (next)" }
 * // ]
 * ```
 */
export const getAvailableWeeks = query({
  args: {
    ...SessionIdArg,
    currentWeek: v.object({
      year: v.number(),
      quarter: v.number(),
      weekNumber: v.number(),
    }),
  },
  handler: async (ctx, args): Promise<WeekOption[]> => {
    const { sessionId, currentWeek } = args;
    await requireLogin(ctx, sessionId);

    const { year, quarter, weekNumber } = currentWeek;
    const { weeks } = getQuarterWeeks(year, quarter);
    const nextWeek = weeks.find((week) => week > weekNumber);

    return weeks.map((week) => {
      let suffix = '';
      if (week === weekNumber) {
        suffix = ' (current)';
      } else if (nextWeek && week === nextWeek) {
        suffix = ' (next)';
      } else if (week < weekNumber) {
        suffix = ' (past)';
      }

      return {
        year,
        quarter,
        weekNumber: week,
        label: `Week ${week}${suffix}`,
      };
    });
  },
});

export const moveGoalsFromDay = mutation({
  args: {
    ...SessionIdArg,
    from: v.object({
      year: v.number(),
      quarter: v.number(),
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
      quarter: v.number(),
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
    moveOnlyIncomplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { sessionId, from, to, dryRun, moveOnlyIncomplete = true } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // === STAGE 1: Identify goals to move ===

    // Find all daily goals from the source day
    const allGoalStates = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q
          .eq('userId', userId)
          .eq('year', from.year)
          .eq('quarter', from.quarter)
          .eq('weekNumber', from.weekNumber)
      )
      .filter((q) =>
        q.and(q.neq(q.field('daily'), undefined), q.eq(q.field('daily.dayOfWeek'), from.dayOfWeek))
      )
      .collect();

    // Get goal objects for all the goal states
    const goalObjects = await Promise.all(
      allGoalStates.map(async (weeklyGoal) => {
        const goal = await ctx.db.get('goals', weeklyGoal.goalId);
        return { weeklyGoal, goal };
      })
    );

    // Filter to only include incomplete goals if moveOnlyIncomplete is true
    const filteredGoalStates = moveOnlyIncomplete
      ? goalObjects
          .filter(({ goal }) => goal && !goal.isComplete)
          .map(({ weeklyGoal }) => weeklyGoal)
      : allGoalStates;

    // Get full details for each goal
    const tasksWithFullDetails = await Promise.all(
      filteredGoalStates.map(async (weeklyGoal) => {
        const dailyGoal = await ctx.db.get('goals', weeklyGoal.goalId);
        if (!dailyGoal || dailyGoal.userId !== userId) return null;

        const weeklyParent = await ctx.db.get('goals', dailyGoal?.parentId as Id<'goals'>);
        if (!weeklyParent || weeklyParent.userId !== userId) return null;

        const quarterlyParent = await ctx.db.get('goals', weeklyParent?.parentId as Id<'goals'>);
        if (!quarterlyParent || quarterlyParent.userId !== userId) return null;

        // Get the quarterly goal's weekly state for starred/pinned status
        const quarterlyGoalWeekly = await ctx.db
          .query('goalStateByWeek')
          .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
            q
              .eq('userId', userId)
              .eq('year', from.year)
              .eq('quarter', from.quarter)
              .eq('weekNumber', from.weekNumber)
          )
          .filter((q) => q.eq(q.field('goalId'), quarterlyParent?._id))
          .first();

        return {
          weeklyGoalState: weeklyGoal,
          details: {
            id: weeklyGoal._id,
            title: dailyGoal?.title ?? '',
            details: dailyGoal?.details,
            weeklyGoal: {
              id: weeklyParent?._id ?? '',
              title: weeklyParent?.title ?? '',
            },
            quarterlyGoal: {
              id: quarterlyParent?._id ?? '',
              title: quarterlyParent?.title ?? '',
              isStarred: quarterlyGoalWeekly?.isStarred ?? false,
              isPinned: quarterlyGoalWeekly?.isPinned ?? false,
            },
          },
        };
      })
    );

    // Filter out any null values
    const validTasks = tasksWithFullDetails.filter(
      (task): task is NonNullable<typeof task> => task !== null
    );

    // === STAGE 2: Take Action (Preview or Update) ===

    // If this is a dry run, return the preview data
    if (dryRun) {
      return {
        canMove: true as const,
        sourceDay: {
          name: getDayName(from.dayOfWeek),
          ...from,
        },
        targetDay: {
          name: getDayName(to.dayOfWeek),
          ...to,
        },
        tasks: validTasks.map((task) => task.details),
      };
    }

    // Not a dry run, perform the actual updates
    // Check if we're moving within the same week
    const isSameWeek =
      from.year === to.year && from.quarter === to.quarter && from.weekNumber === to.weekNumber;

    if (isSameWeek) {
      // Moving within the same week, just update the day
      await Promise.all(
        validTasks.map(async (task) => {
          await ctx.db.patch('goalStateByWeek', task.weeklyGoalState._id, {
            daily: {
              ...task.weeklyGoalState.daily,
              dayOfWeek: to.dayOfWeek,
            },
          });
        })
      );
    } else {
      // Moving to a different week, need to update both weekNumber and dayOfWeek
      await Promise.all(
        validTasks.map(async (task) => {
          await ctx.db.patch('goalStateByWeek', task.weeklyGoalState._id, {
            year: to.year,
            quarter: to.quarter,
            weekNumber: to.weekNumber,
            daily: {
              ...task.weeklyGoalState.daily,
              dayOfWeek: to.dayOfWeek,
            },
          });
        })
      );
    }

    return { tasksMoved: validTasks.length };
  },
});

export const getAllChildGoals = internalQuery({
  args: {
    parentInPath: v.string(),
    parentId: v.id('goals'),
    userId: v.id('users'),
    year: v.number(),
    quarter: v.number(),
  },
  handler: async (ctx, args) => {
    const { parentInPath, parentId, userId, year, quarter } = args;
    const childGoalInPathPrefix = joinPath(parentInPath, parentId);
    const childGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) =>
        q.eq('userId', userId).eq('year', year).eq('quarter', quarter)
      )
      .filter((q) =>
        q.and(
          q.gte(q.field('inPath'), childGoalInPathPrefix),
          q.lt(q.field('inPath'), getNextPath(childGoalInPathPrefix))
        )
      )
      .collect();
    return childGoals;
  },
});

export const deleteGoal = mutation({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId, dryRun = false } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the goal and verify ownership
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
        message: 'You do not have permission to delete this goal',
      });
    }

    const pathPrefixForChildGoals = joinPath(goal.inPath, goal._id);
    // Check for child goals
    const childGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) =>
        q.eq('userId', userId).eq('year', goal.year).eq('quarter', goal.quarter)
      )
      .filter((q) =>
        q.and(
          q.gte(q.field('inPath'), pathPrefixForChildGoals),
          q.lt(q.field('inPath'), getNextPath(pathPrefixForChildGoals))
        )
      )
      .collect();

    // If this is a dry run, return a preview of what will be deleted
    if (dryRun) {
      // Organize goals by depth for preview
      const allGoals = [goal, ...childGoals];

      // Fetch goal states for all goals
      const goalIds = allGoals.map((g) => g._id);
      const goalStates = await ctx.db
        .query('goalStateByWeek')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', userId))
        .filter((q) => q.or(...goalIds.map((id) => q.eq(q.field('goalId'), id))))
        .collect();

      // Group goal states by goal ID
      const goalStatesByGoalId = goalStates.reduce(
        (acc, state) => {
          if (!acc[state.goalId]) {
            acc[state.goalId] = [];
          }
          acc[state.goalId].push(state);
          return acc;
        },
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic goal state types from database
        {} as Record<Id<'goals'>, any[]>
      );

      // Build a tree structure for the goals with state information
      const { tree: goalsTree } = buildGoalTreeForPreview(allGoals, goalStatesByGoalId);

      return {
        isDryRun: true,
        goalsToDelete: goalsTree,
      };
    }

    //delete all goals including itself
    const goalIds = [...childGoals.map((g) => g._id), goalId];

    // First, delete all associated goal states
    const goalStates = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_goal', (q) => q.eq('userId', userId))
      .filter((q) => q.or(...goalIds.map((id) => q.eq(q.field('goalId'), id))))
      .collect();

    // Delete all goal states
    await Promise.all(goalStates.map((state) => ctx.db.delete('goalStateByWeek', state._id)));

    // Then delete the goals themselves
    await Promise.all(goalIds.map((id) => ctx.db.delete('goals', id)));

    return goalId;
  },
});

// Helper function to build a tree of goals for preview
function buildGoalTreeForPreview(
  goals: Doc<'goals'>[],
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic goal state types from database
  goalStatesByGoalId: Record<Id<'goals'>, any[]> = {}
) {
  const roots: GoalPreviewNode[] = [];

  // Find the main goal (the one being deleted)
  // This is typically the first goal in the array
  const mainGoal = goals[0];

  // Index all nodes
  const nodeIndex = goals.reduce(
    (acc, goal) => {
      // Get unique weeks for this goal from its states
      const goalStates = goalStatesByGoalId[goal._id] || [];
      const weeks = [...new Set(goalStates.map((state) => state.weekNumber))].sort((a, b) => a - b);

      const node: GoalPreviewNode = {
        _id: goal._id,
        title: goal.title,
        depth: goal.depth,
        children: [],
        weeks: weeks.length > 0 ? weeks : undefined,
      };
      acc[goal._id] = node;
      return acc;
    },
    {} as Record<Id<'goals'>, GoalPreviewNode>
  );

  // Build the tree structure
  for (const goal of goals) {
    const node = nodeIndex[goal._id];

    // The main goal is always a root, regardless of depth
    if (goal._id === mainGoal._id) {
      roots.push(node);
    } else if (goal.parentId && nodeIndex[goal.parentId]) {
      // Add as child to parent
      nodeIndex[goal.parentId].children.push(node);
    }
  }

  return {
    tree: roots,
    index: nodeIndex,
  };
}

// Type for goal preview nodes
type GoalPreviewNode = {
  _id: Id<'goals'>;
  title: string;
  depth: number;
  children: GoalPreviewNode[];
  weeks?: number[];
};

// Define the return types for our cleanupOrphanedGoalStates mutation
type OrphanedStatePreview = {
  _id: Id<'goalStateByWeek'>;
  goalId: Id<'goals'>;
  year: number;
  quarter: number;
  weekNumber: number;
};

type CleanupOrphanedGoalStatesDryRunResult = {
  isDryRun: true;
  orphanedStates: OrphanedStatePreview[];
  count: number;
};

type CleanupOrphanedGoalStatesCommitResult = {
  isDryRun: false;
  deletedCount: number;
};

type CleanupOrphanedGoalStatesResult =
  | CleanupOrphanedGoalStatesDryRunResult
  | CleanupOrphanedGoalStatesCommitResult;

export const cleanupOrphanedGoalStatesForUser = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<CleanupOrphanedGoalStatesResult> => {
    const { dryRun = true } = args;

    // Get all goal states for the user
    const goalStates = await ctx.db.query('goalStateByWeek').collect();

    // Get all unique goal IDs from the states
    const uniqueGoalIds = [...new Set(goalStates.map((state) => state.goalId))];

    // Get all existing goals for these IDs
    const existingGoals = await Promise.all(uniqueGoalIds.map((id) => ctx.db.get('goals', id)));

    // Create a set of existing goal IDs for quick lookup
    const existingGoalIds = new Set(existingGoals.filter(Boolean).map((goal) => goal?._id));

    // Find orphaned goal states (where the goal doesn't exist)
    const orphanedStates = goalStates.filter((state) => !existingGoalIds.has(state.goalId));

    // If this is a dry run, just return the orphaned states without deleting
    if (dryRun) {
      return {
        isDryRun: true,
        orphanedStates: orphanedStates.map((state) => ({
          _id: state._id,
          goalId: state.goalId,
          year: state.year,
          quarter: state.quarter,
          weekNumber: state.weekNumber,
        })),
        count: orphanedStates.length,
      };
    }

    // Otherwise, delete the orphaned states
    await Promise.all(orphanedStates.map((state) => ctx.db.delete('goalStateByWeek', state._id)));

    return {
      isDryRun: false,
      deletedCount: orphanedStates.length,
    };
  },
});

// Type definitions for the exported data
type QuarterlyGoalPreview = {
  id: Id<'goals'>;
  title: string;
  details?: string;
  isStarred: boolean;
  isPinned: boolean;
};

/**
 * Result of moving a quarterly goal to a new quarter.
 *
 * @internal
 */
interface MoveQuarterlyGoalResultSuccess {
  /** ID of the goal in the target quarter (created or reused) */
  newGoalId: Id<'goals'>;
  /** Number of weekly goals created (newly migrated) */
  weeklyGoalsMigrated: number;
  /** Number of weekly goals that were reused (already existed) */
  weeklyGoalsReused: number;
  /** Number of daily goals created (newly migrated) */
  dailyGoalsMigrated: number;
  /** Number of daily goals that were reused (already existed) */
  dailyGoalsReused: number;
  /** Whether the quarterly goal was created (false if reused existing) */
  quarterlyGoalWasCreated: boolean;
}

/**
 * Error result when a quarterly goal migration fails.
 *
 * @internal
 */
interface MoveQuarterlyGoalResultError {
  /** Error message describing the failure */
  error: string;
}

/**
 * Combined result type for quarterly goal migration.
 *
 * @internal
 */
type MoveQuarterlyGoalMigrationResult =
  | MoveQuarterlyGoalResultSuccess
  | MoveQuarterlyGoalResultError;

/**
 * Result returned from the moveGoalsFromQuarter action.
 *
 * @public
 */
export interface MoveGoalsFromQuarterResult {
  /** Number of quarterly goals successfully copied */
  quarterlyGoalsCopied: number;
  /** Number of adhoc goals successfully moved */
  adhocGoalsMoved: number;
  /** Individual results for each goal migration attempt */
  results: MoveQuarterlyGoalMigrationResult[];
}

/**
 * Moves incomplete goals from one quarter to another.
 * Use the `getQuarterGoalsMovePreview` query to preview goals before calling this action.
 *
 * @public
 *
 * @param sessionId - User session ID for authentication
 * @param from - Source quarter to move goals from
 * @param to - Target quarter to move goals to
 * @param selectedQuarterlyGoalIds - Optional list of specific quarterly goal IDs to move
 * @param selectedAdhocGoalIds - Optional list of specific adhoc goal IDs to move
 * @returns Promise resolving to migration results
 * @throws {ConvexError} When user is not authenticated or quarters are the same
 */
export const moveGoalsFromQuarter = action({
  args: {
    ...SessionIdArg,
    from: v.object({
      year: v.number(),
      quarter: v.number(),
    }),
    to: v.object({
      year: v.number(),
      quarter: v.number(),
    }),
    // Specify which goals to move (if not provided, moves all incomplete goals)
    selectedQuarterlyGoalIds: v.optional(v.array(v.id('goals'))),
    selectedAdhocGoalIds: v.optional(v.array(v.id('goals'))),
  },
  handler: async (ctx, args): Promise<MoveGoalsFromQuarterResult> => {
    const { sessionId, from, to, selectedQuarterlyGoalIds, selectedAdhocGoalIds } = args;

    // Auth check - look up session by sessionId field
    const session = await ctx.runQuery(internal.goal.getSessionBySessionId, { sessionId });
    if (!session) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Session not found',
      });
    }
    const user = await ctx.runQuery(internal.goal.getUserById, { userId: session.userId });
    if (!user) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }
    const userId = user._id;

    // Validate that we're not moving goals to the same quarter
    if (from.year === to.year && from.quarter === to.quarter) {
      throw new ConvexError('Cannot move goals to the same quarter');
    }

    console.log(
      `[moveGoalsFromQuarter] Moving from Q${from.quarter} ${from.year} to Q${to.quarter} ${to.year}`
    );

    // Get all quarterly goals from the source quarter
    const allQuarterlyGoals = await ctx.runQuery(internal.goal.getIncompleteQuarterlyGoals, {
      userId,
      year: from.year,
      quarter: from.quarter,
    });
    console.log(`[moveGoalsFromQuarter] Found ${allQuarterlyGoals.length} quarterly goals`);

    // Get incomplete adhoc goals from the source quarter
    const allAdhocGoals = await ctx.runQuery(internal.goal.getIncompleteAdhocGoalsForQuarter, {
      userId,
      year: from.year,
      quarter: from.quarter,
    });
    console.log(`[moveGoalsFromQuarter] Found ${allAdhocGoals.length} adhoc goals`);

    // Filter goals based on selection (if provided)
    const quarterlyGoals = selectedQuarterlyGoalIds
      ? allQuarterlyGoals.filter((g) => selectedQuarterlyGoalIds.includes(g.id))
      : allQuarterlyGoals;

    const adhocGoals = selectedAdhocGoalIds
      ? allAdhocGoals.filter((g) => selectedAdhocGoalIds.includes(g.id))
      : allAdhocGoals;

    console.log(
      `[moveGoalsFromQuarter] After selection filter: ${quarterlyGoals.length} quarterly, ${adhocGoals.length} adhoc`
    );

    // Migrate each quarterly goal sequentially
    const migrationResults: MoveQuarterlyGoalMigrationResult[] = [];
    for (const goal of quarterlyGoals) {
      try {
        const result = await ctx.runMutation(api.goal.moveQuarterlyGoal, {
          sessionId,
          goalId: goal.id,
          from,
          to,
        });
        migrationResults.push(result);
      } catch (error) {
        console.error(`Failed to migrate goal ${goal.id}:`, error);
        migrationResults.push({ error: `Failed to migrate goal: ${error}` });
      }
    }

    // Move adhoc goals to the new quarter
    let adhocGoalsMoved = 0;
    if (adhocGoals.length > 0) {
      try {
        const adhocResult = await ctx.runMutation(internal.goal.moveAdhocGoalsToQuarter, {
          userId,
          adhocGoals: adhocGoals.map((g) => g.id),
          to,
        });
        adhocGoalsMoved = adhocResult.goalsMoved;
      } catch (error) {
        console.error('Failed to migrate adhoc goals:', error);
      }
    }

    return {
      results: migrationResults,
      quarterlyGoalsCopied: migrationResults.filter((r) => !('error' in r)).length,
      adhocGoalsMoved,
    };
  },
});

/**
 * Preview data for adhoc goals that can be moved to a new quarter.
 *
 * @public
 */
export interface AdhocGoalPreview {
  /** Goal ID */
  id: Id<'goals'>;
  /** Goal title */
  title: string;
  /** Optional goal details/description */
  details?: string;
  /** Associated domain ID */
  domainId?: Id<'domains'>;
  /** Associated domain name for display */
  domainName?: string;
  /** Due date timestamp */
  dueDate?: number;
}

/**
 * Result from the getQuarterGoalsMovePreview query.
 *
 * @public
 */
export interface QuarterGoalsMovePreviewResult {
  /** Quarterly goals available to copy to the target quarter */
  quarterlyGoalsToCopy: QuarterlyGoalPreview[];
  /** Adhoc goals available to copy to the target quarter */
  adhocGoalsToCopy: AdhocGoalPreview[];
  /** Source quarter information */
  from: { year: number; quarter: number };
  /** Target quarter information */
  to: { year: number; quarter: number };
}

/**
 * Retrieves a preview of goals that can be moved from a previous quarter.
 * This is a reactive query that the frontend can subscribe to for live updates.
 *
 * @public
 *
 * @param sessionId - User session ID for authentication
 * @param from - Source quarter to preview goals from
 * @param to - Target quarter to move goals to
 * @returns Preview data containing incomplete quarterly and adhoc goals
 * @throws {ConvexError} When user is not authenticated or quarters are the same
 */
export const getQuarterGoalsMovePreview = query({
  args: {
    ...SessionIdArg,
    from: v.object({
      year: v.number(),
      quarter: v.number(),
    }),
    to: v.object({
      year: v.number(),
      quarter: v.number(),
    }),
  },
  handler: async (ctx, args): Promise<QuarterGoalsMovePreviewResult> => {
    const { sessionId, from, to } = args;

    // Auth check
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Validate that we're not moving goals to the same quarter
    if (from.year === to.year && from.quarter === to.quarter) {
      throw new ConvexError('Cannot move goals to the same quarter');
    }

    // Get all incomplete quarterly goals from the source quarter
    const allQuarterlyGoals = await getIncompleteQuarterlyGoalsInternal(ctx, {
      userId,
      year: from.year,
      quarter: from.quarter,
    });

    // Get incomplete adhoc goals from the source quarter
    const allAdhocGoals = await getIncompleteAdhocGoalsForQuarterInternal(ctx, {
      userId,
      year: from.year,
      quarter: from.quarter,
    });

    return {
      quarterlyGoalsToCopy: allQuarterlyGoals,
      adhocGoalsToCopy: allAdhocGoals,
      from,
      to,
    };
  },
});

/**
 * Retrieves detailed information about a goal for the quarterly pull preview.
 * Shows only children from the last non-empty week of the specified quarter.
 *
 * This query is specifically designed for the quarterly goal pull preview, where we need
 * to show only the goals from the last active week of a quarter to avoid pulling duplicates.
 *
 * @public
 * @param sessionId - Session ID for authentication
 * @param goalId - ID of the goal to retrieve
 * @param year - Year of the quarter context
 * @param quarter - Quarter number (1-4) of the quarter context
 * @returns Goal details including domain, state, and children from last week, or null if not found
 */
export const getGoalPullPreviewDetails = query({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    year: v.number(),
    quarter: v.number(),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId, year, quarter } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get the goal
    const goal = await ctx.db.get('goals', goalId);
    if (!goal) {
      return null;
    }

    // Verify ownership
    if (goal.userId !== userId) {
      return null;
    }

    // Verify the goal belongs to the specified year/quarter
    if (goal.year !== year || goal.quarter !== quarter) {
      return null;
    }

    // Get domain if exists
    let domain: Doc<'domains'> | null = null;
    if (goal.domainId) {
      domain = await ctx.db.get('domains', goal.domainId);
    }

    // Get goal state for the most recent week (for quarterly goals)
    let state: { isStarred: boolean; isPinned: boolean } | null = null;
    if (goal.depth === 0) {
      // Quarterly goal - get latest state
      const states = await ctx.db
        .query('goalStateByWeek')
        .withIndex('by_user_and_goal_and_year_and_quarter_and_week', (q) =>
          q.eq('userId', userId).eq('goalId', goalId).eq('year', year).eq('quarter', quarter)
        )
        .order('desc')
        .take(1);

      if (states.length > 0) {
        state = {
          isStarred: states[0].isStarred ?? false,
          isPinned: states[0].isPinned ?? false,
        };
      }
    }

    // Get children (weekly goals for quarterly, or adhoc children)
    let weeklyGoals: Doc<'goals'>[] = [];
    let lastNonEmptyWeek: number | undefined = undefined;

    if (goal.depth === 0) {
      // For quarterly goals, only show weekly goals from the last non-empty week
      // Use the shared helper to find the max week for this quarterly goal
      const maxWeekResult = await findMaxWeekForQuarterlyGoal(ctx, userId, goalId, year, quarter);

      if (maxWeekResult.maxWeek !== null) {
        lastNonEmptyWeek = maxWeekResult.maxWeek;

        // Get only the weekly goals that exist in the max week and are incomplete
        const allWeeklyGoals = await ctx.db
          .query('goals')
          .withIndex('by_user_and_year_and_quarter_and_parent', (q) =>
            q.eq('userId', userId).eq('year', year).eq('quarter', quarter).eq('parentId', goalId)
          )
          .collect();

        // Filter to only incomplete goals in the max week (matches what will actually be migrated)
        weeklyGoals = allWeeklyGoals.filter(
          (g) => maxWeekResult.weeklyGoalIdsInMaxWeek.has(g._id) && !g.isComplete
        );
      } else {
        // No states found - return empty array instead of all goals
        // This indicates no active weekly goals exist for this quarterly goal
        weeklyGoals = [];
      }

      // For each weekly goal, fetch its daily goal children from the last non-empty week
      const weeklyGoalIds = new Set(weeklyGoals.map((g) => g._id));

      // Get all daily goals that are children of our weekly goals
      const allDailyGoals = await ctx.db
        .query('goals')
        .withIndex('by_user_and_year_and_quarter', (q) =>
          q.eq('userId', userId).eq('year', year).eq('quarter', quarter)
        )
        .filter((q) => q.eq(q.field('depth'), 2))
        .collect();

      // Filter to only daily goals belonging to our weekly goals
      const dailyGoalsForWeeklyGoals = allDailyGoals.filter(
        (g) => g.parentId && weeklyGoalIds.has(g.parentId)
      );

      // If we have a lastNonEmptyWeek, filter daily goals to only those with states in that week
      let dailyGoalsToShow: Doc<'goals'>[] = [];
      // Use const to narrow the type for use in the query callback
      const maxWeek = lastNonEmptyWeek;
      if (maxWeek !== undefined && dailyGoalsForWeeklyGoals.length > 0) {
        const dailyGoalStatesInMaxWeek = await ctx.db
          .query('goalStateByWeek')
          .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
            q.eq('userId', userId).eq('year', year).eq('quarter', quarter).eq('weekNumber', maxWeek)
          )
          .collect();

        const dailyGoalIdsWithState = new Set(dailyGoalStatesInMaxWeek.map((s) => s.goalId));

        // Filter to only incomplete daily goals that have states in the max week
        dailyGoalsToShow = dailyGoalsForWeeklyGoals.filter(
          (g) => dailyGoalIdsWithState.has(g._id) && !g.isComplete
        );
      }

      // Group daily goals by their parent weekly goal ID
      const dailyGoalsByParent = new Map<Id<'goals'>, Doc<'goals'>[]>();
      for (const daily of dailyGoalsToShow) {
        if (daily.parentId) {
          const existing = dailyGoalsByParent.get(daily.parentId) || [];
          existing.push(daily);
          dailyGoalsByParent.set(daily.parentId, existing);
        }
      }

      return {
        _id: goal._id,
        title: goal.title,
        details: goal.details,
        isComplete: goal.isComplete,
        completedAt: goal.completedAt,
        dueDate: goal.dueDate,
        depth: goal.depth,
        year: goal.year,
        quarter: goal.quarter,
        adhoc: goal.adhoc,
        domain,
        state,
        lastNonEmptyWeek, // Include the week number for the frontend
        children: weeklyGoals.map((weeklyGoal) => {
          const dailyChildren = dailyGoalsByParent.get(weeklyGoal._id) || [];
          return {
            _id: weeklyGoal._id,
            title: weeklyGoal.title,
            details: weeklyGoal.details,
            isComplete: weeklyGoal.isComplete,
            depth: weeklyGoal.depth,
            // Include daily goals as children of weekly goals
            children: dailyChildren.map((daily) => ({
              _id: daily._id,
              title: daily.title,
              isComplete: daily.isComplete,
              depth: daily.depth,
            })),
          };
        }),
      };
    }

    // For non-quarterly goals, get all children normally (no grandchildren)
    const children = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter_and_parent', (q) =>
        q.eq('userId', userId).eq('year', year).eq('quarter', quarter).eq('parentId', goalId)
      )
      .collect();

    return {
      _id: goal._id,
      title: goal.title,
      details: goal.details,
      isComplete: goal.isComplete,
      completedAt: goal.completedAt,
      dueDate: goal.dueDate,
      depth: goal.depth,
      year: goal.year,
      quarter: goal.quarter,
      adhoc: goal.adhoc,
      domain,
      state,
      lastNonEmptyWeek, // Include the week number for the frontend
      children: children.map((child) => ({
        _id: child._id,
        title: child.title,
        isComplete: child.isComplete,
      })),
    };
  },
});

/**
 * Fetches incomplete quarterly goals from a source quarter.
 * Shared helper function used by both the public query and internal queries.
 *
 * @internal
 *
 * @param ctx - Query context for database access
 * @param args - Query parameters including userId, year, and quarter
 * @returns Array of quarterly goal previews with starred/pinned status
 */
async function getIncompleteQuarterlyGoalsInternal(
  ctx: QueryCtx,
  args: { userId: Id<'users'>; year: number; quarter: number }
): Promise<QuarterlyGoalPreview[]> {
  const { userId, year, quarter } = args;

  // Get all quarterly goals from the source quarter using index
  const quarterlyGoals = await ctx.db
    .query('goals')
    .withIndex('by_user_and_year_and_quarter', (q) =>
      q.eq('userId', userId).eq('year', year).eq('quarter', quarter)
    )
    .filter((q) => q.eq(q.field('depth'), 0)) // Quarterly goals have depth 0
    .collect();

  // Get the final weeks of the source quarter
  const finalWeeksOfSourceQuarter = getFinalWeeksOfQuarter(year, quarter);

  // Find the latest week number from final weeks
  const latestWeek = finalWeeksOfSourceQuarter.reduce(
    (latest, week) => Math.max(latest, week.weekNumber),
    0
  );

  // Get the goal states for these quarterly goals to check starred/pinned status
  const quarterlyGoalIds = quarterlyGoals.map((goal) => goal._id);
  const quarterlyGoalStates = await ctx.db
    .query('goalStateByWeek')
    .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
      q.eq('userId', userId).eq('year', year).eq('quarter', quarter).eq('weekNumber', latestWeek)
    )
    .filter((q) =>
      q.and(
        q.or(...quarterlyGoalIds.map((id) => q.eq(q.field('goalId'), id))),
        q.eq(q.field('year'), year)
      )
    )
    .collect();

  // Create a map of goalId -> latest state to handle duplicates
  const latestStateByGoalId = new Map<Id<'goals'>, Doc<'goalStateByWeek'>>();
  for (const state of quarterlyGoalStates) {
    const existing = latestStateByGoalId.get(state.goalId);
    if (!existing || existing._creationTime < state._creationTime) {
      latestStateByGoalId.set(state.goalId, state);
    }
  }

  // Filter goals to only include incomplete ones
  const incompleteQuarterlyGoals = quarterlyGoals.filter((goal) => !goal.isComplete);

  // Format response data
  return incompleteQuarterlyGoals.map((goal) => {
    const latestState = latestStateByGoalId.get(goal._id);
    return {
      id: goal._id,
      title: goal.title,
      details: goal.details,
      isStarred: latestState?.isStarred || false,
      isPinned: latestState?.isPinned || false,
    };
  });
}

/**
 * Fetches incomplete adhoc goals from a source quarter.
 * Shared helper function used by both the public query and internal queries.
 *
 * @internal
 *
 * @param ctx - Query context for database access
 * @param args - Query parameters including userId, year, and quarter
 * @returns Array of adhoc goal previews with domain information
 */
async function getIncompleteAdhocGoalsForQuarterInternal(
  ctx: QueryCtx,
  args: { userId: Id<'users'>; year: number; quarter: number }
): Promise<AdhocGoalPreview[]> {
  const { userId, year, quarter } = args;

  // Get all weeks in the source quarter
  const quarterWeeksInfo = getQuarterWeeks(year, quarter);
  const weekNumbers = quarterWeeksInfo.weeks;

  // Query adhoc goals for each week in the quarter using index
  const adhocGoalPromises = weekNumbers.map((weekNumber) =>
    ctx.db
      .query('goals')
      .withIndex('by_user_and_adhoc_year_week', (q) =>
        q.eq('userId', userId).eq('year', year).eq('adhoc.weekNumber', weekNumber)
      )
      .filter((q) => q.eq(q.field('isComplete'), false))
      .collect()
  );

  const adhocGoalArrays = await Promise.all(adhocGoalPromises);
  const incompleteAdhocGoals = adhocGoalArrays.flat();

  // Get domain information for these goals
  const domainIds = [
    ...new Set(
      incompleteAdhocGoals.map((goal) => goal.domainId).filter((id): id is Id<'domains'> => !!id)
    ),
  ];
  const domains = await Promise.all(domainIds.map((id) => ctx.db.get('domains', id)));
  const domainMap = new Map(
    domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
  );

  // Format response data
  return incompleteAdhocGoals.map((goal) => {
    const effectiveDomainId = goal.domainId;
    return {
      id: goal._id,
      title: goal.title,
      details: goal.details,
      domainId: effectiveDomainId,
      domainName: effectiveDomainId ? domainMap.get(effectiveDomainId)?.name : undefined,
      dueDate: goal.adhoc?.dueDate,
    };
  });
}

// Add a helper internal query to get incomplete quarterly goals
export const getIncompleteQuarterlyGoals = internalQuery({
  args: {
    userId: v.id('users'),
    year: v.number(),
    quarter: v.number(),
  },
  handler: async (ctx, args): Promise<QuarterlyGoalPreview[]> => {
    const { userId, year, quarter } = args;

    // Get all quarterly goals from the source quarter
    const quarterlyGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) =>
        q.eq('userId', userId).eq('year', year).eq('quarter', quarter)
      )
      .filter((q) => q.eq(q.field('depth'), 0)) // Quarterly goals have depth 0
      .collect();

    // Get the final weeks of the source quarter
    const finalWeeksOfSourceQuarter = getFinalWeeksOfQuarter(year, quarter);

    // Find the latest week number from final weeks
    const latestWeek = finalWeeksOfSourceQuarter.reduce(
      (latest, week) => Math.max(latest, week.weekNumber),
      0
    );

    // Get the goal states for these quarterly goals to check completion status
    const quarterlyGoalIds = quarterlyGoals.map((goal) => goal._id);
    const quarterlyGoalStates = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q.eq('userId', userId).eq('year', year).eq('quarter', quarter).eq('weekNumber', latestWeek)
      )
      .filter((q) =>
        q.and(
          q.or(...quarterlyGoalIds.map((id) => q.eq(q.field('goalId'), id))),
          q.eq(q.field('year'), year)
        )
      )
      .collect();

    // Create a map of goalId -> latest state to handle any duplicates
    const latestStateByGoalId = quarterlyGoalStates.reduce(
      (acc, state) => {
        const existing = acc[state.goalId];
        if (!existing || existing._creationTime < state._creationTime) {
          acc[state.goalId] = state;
        }
        return acc;
      },
      {} as Record<Id<'goals'>, Doc<'goalStateByWeek'>>
    );

    // Filter goals to only include those with an incomplete state in the latest week
    // or those with no state in the latest week (which we consider incomplete)
    const incompleteQuarterlyGoals = quarterlyGoals.filter((goal) => {
      // Check the goal's isComplete field directly since it's been migrated from goalStateByWeek
      return !goal.isComplete;
    });

    // Format response data
    return incompleteQuarterlyGoals.map((goal) => {
      const latestState = latestStateByGoalId[goal._id];
      return {
        id: goal._id,
        title: goal.title,
        details: goal.details,
        isStarred: latestState?.isStarred || false,
        isPinned: latestState?.isPinned || false,
      };
    });
  },
});

// Add a helper internal query to get incomplete adhoc goals for a quarter
export const getIncompleteAdhocGoalsForQuarter = internalQuery({
  args: {
    userId: v.id('users'),
    year: v.number(),
    quarter: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, year, quarter } = args;

    // Get all weeks in the source quarter
    const quarterWeeksInfo = getQuarterWeeks(year, quarter);
    const weekNumbers = quarterWeeksInfo.weeks;

    // Query adhoc goals for each week in the quarter
    // We need to do this because adhoc goals are indexed by week, not quarter
    const adhocGoalPromises = weekNumbers.map((weekNumber: number) =>
      ctx.db
        .query('goals')
        .withIndex('by_user_and_adhoc_year_week', (q) =>
          q.eq('userId', userId).eq('year', year).eq('adhoc.weekNumber', weekNumber)
        )
        .filter((q) => q.eq(q.field('isComplete'), false))
        .collect()
    );

    const adhocGoalArrays = await Promise.all(adhocGoalPromises);

    const incompleteAdhocGoals = adhocGoalArrays.flat();

    // Get domain information for these goals
    const domainIds = [
      ...new Set(
        incompleteAdhocGoals
          .map((goal: Doc<'goals'>) => goal.domainId)
          .filter(Boolean) as Id<'domains'>[]
      ),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get('domains', id)));
    const domainMap = new Map(
      domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
    );

    // Format response data
    return incompleteAdhocGoals.map((goal: Doc<'goals'>) => {
      const effectiveDomainId = goal.domainId;
      return {
        id: goal._id,
        title: goal.title,
        details: goal.details,
        domainId: effectiveDomainId,
        domainName: effectiveDomainId ? domainMap.get(effectiveDomainId)?.name : undefined,
        // dayOfWeek removed - adhoc tasks are week-level only
        dueDate: goal.adhoc?.dueDate,
      };
    });
  },
});

// Add a helper internal mutation to move adhoc goals to a new quarter
export const moveAdhocGoalsToQuarter = internalMutation({
  args: {
    userId: v.id('users'),
    adhocGoals: v.array(v.id('goals')),
    to: v.object({
      year: v.number(),
      quarter: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, adhocGoals: goalIds, to } = args;

    // Get the first week of the target quarter
    const firstWeekInfo = getFirstWeekOfQuarter(to.year, to.quarter);

    // Update each adhoc goal to the first week of the target quarter
    await Promise.all(
      goalIds.map(async (goalId) => {
        const goal = await ctx.db.get('goals', goalId);
        if (!goal || goal.userId !== userId || !goal.adhoc) return;

        await ctx.db.patch('goals', goalId, {
          year: firstWeekInfo.year, // Use the ISO week year for the first week
          quarter: to.quarter,
          adhoc: {
            ...goal.adhoc,
            weekNumber: firstWeekInfo.weekNumber,
          },
        });

        // Update adhoc goal state
        const state = await ctx.db
          .query('adhocGoalStates')
          .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
          .first();

        if (state) {
          await ctx.db.patch('adhocGoalStates', state._id, {
            year: firstWeekInfo.year,
            weekNumber: firstWeekInfo.weekNumber,
          });
        }
      })
    );

    return {
      goalsMoved: goalIds.length,
    };
  },
});

// Add a mutation to move a single quarterly goal to a different quarter
export const moveQuarterlyGoal = mutation({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    from: v.object({
      year: v.number(),
      quarter: v.number(),
    }),
    to: v.object({
      year: v.number(),
      quarter: v.number(),
    }),
  },
  handler: async (ctx, args): Promise<MoveQuarterlyGoalResultSuccess> => {
    const { sessionId, goalId, from, to } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the quarterly goal and verify ownership
    const quarterlyGoal = await ctx.db.get('goals', goalId);
    if (!quarterlyGoal) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Goal not found',
      });
    }
    if (quarterlyGoal.userId !== userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You do not have permission to move this goal',
      });
    }
    if (quarterlyGoal.depth !== 0) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Only quarterly goals can be moved',
      });
    }

    // Verify the goal belongs to the source quarter
    if (quarterlyGoal.year !== from.year || quarterlyGoal.quarter !== from.quarter) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Goal does not belong to the specified source quarter',
      });
    }
    // Get all weeks in the source quarter
    const { weeks: sourceQuarterWeeks } = getQuarterWeeks(from.year, from.quarter);

    // Find the max week for this quarterly goal's children using the shared helper
    const maxWeekResult = await findMaxWeekForQuarterlyGoal(
      ctx,
      userId,
      goalId,
      from.year,
      from.quarter
    );

    // If no weekly goal states found, use the last week of the quarter as fallback
    const lastNonEmptyWeek =
      maxWeekResult.maxWeek !== null
        ? maxWeekResult.maxWeek
        : (sourceQuarterWeeks[sourceQuarterWeeks.length - 1] ?? 1);

    // Get quarterly goal states to check starred/pinned status from the last non-empty week
    const quarterlyGoalStates = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_goal_and_year_and_quarter_and_week', (q) =>
        q
          .eq('userId', userId)
          .eq('goalId', goalId)
          .eq('year', from.year)
          .eq('quarter', from.quarter)
          .eq('weekNumber', lastNonEmptyWeek)
      )
      .collect();

    // Find the first state to get starred/pinned info
    const firstState = quarterlyGoalStates.reduce(
      (first, state) => {
        if (!first || state._creationTime < first._creationTime) {
          return state;
        }
        return first;
      },
      null as Doc<'goalStateByWeek'> | null
    );

    // Get all week numbers in the target quarter using the proper utility
    const { weeks, startWeek } = getQuarterWeeks(to.year, to.quarter);

    // Check if a quarterly goal with the same rootGoalId already exists in the target quarter
    const quarterlyRootGoalId = quarterlyGoal.carryOver?.fromGoal?.rootGoalId ?? quarterlyGoal._id;
    const existingQuarterlyGoalsMap = await buildExistingGoalsMap(
      ctx,
      userId,
      to.year,
      to.quarter,
      0 // depth 0 = quarterly
    );
    const existingQuarterlyGoal = existingQuarterlyGoalsMap.get(quarterlyRootGoalId.toString());

    let newQuarterlyGoalId: Id<'goals'>;
    let quarterlyGoalWasCreated = false;

    if (existingQuarterlyGoal) {
      // Reuse the existing quarterly goal
      newQuarterlyGoalId = existingQuarterlyGoal._id;
      console.log(
        `[moveQuarterlyGoal] Reusing existing quarterly goal ${newQuarterlyGoalId} ` +
          `(rootGoalId: ${quarterlyRootGoalId})`
      );
    } else {
      // Create a new quarterly goal in the target quarter using the shared helper
      newQuarterlyGoalId = await createGoalWithCarryOver({
        ctx,
        userId,
        sourceGoal: quarterlyGoal,
        target: to,
        depth: GoalDepth.QUARTERLY,
        inPath: '/',
      });
      quarterlyGoalWasCreated = true;

      // Create goal states for all weeks in the new quarter using the shared helper
      const weekStatePromises = weeks.map((weekNum) =>
        createGoalState({
          ctx,
          userId,
          goalId: newQuarterlyGoalId,
          year: to.year,
          quarter: to.quarter,
          weekNumber: weekNum,
          // Keep the original starred/pinned status on the first state
          isStarred: weekNum === startWeek ? firstState?.isStarred || false : false,
          isPinned: weekNum === startWeek ? firstState?.isPinned || false : false,
        })
      );

      await Promise.all(weekStatePromises);
    }

    // Get all weekly goals for this quarterly goal
    const allWeeklyGoalsForQuarterly = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter_and_parent', (q) =>
        q
          .eq('userId', userId)
          .eq('year', from.year)
          .eq('quarter', from.quarter)
          .eq('parentId', goalId)
      )
      .collect();

    // Filter weekly goals to only those that have a state in the max week
    const weeklyGoalsInMaxWeek = allWeeklyGoalsForQuarterly.filter(
      (goal) => maxWeekResult.weeklyGoalIdsInMaxWeek.has(goal._id) && !goal.isComplete
    );

    // Deduplicate by rootGoalId using the shared helper
    const deduplicatedWeeklyGoals = deduplicateByRootGoalId(weeklyGoalsInMaxWeek);

    // Get goal states in the max week for these weekly goals to get starred/pinned info
    const weeklyGoalStatesInMaxWeek =
      deduplicatedWeeklyGoals.length > 0
        ? await ctx.db
            .query('goalStateByWeek')
            .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
              q
                .eq('userId', userId)
                .eq('year', from.year)
                .eq('quarter', from.quarter)
                .eq('weekNumber', lastNonEmptyWeek)
            )
            .filter((q) =>
              q.or(...deduplicatedWeeklyGoals.map((g) => q.eq(q.field('goalId'), g._id)))
            )
            .collect()
        : [];

    // Create a map of state by goalId for getting day of week info (for weekly and daily goals)
    const weeklyStateByGoalId = new Map<Id<'goals'>, Doc<'goalStateByWeek'>>();
    weeklyGoalStatesInMaxWeek.forEach((state) => {
      weeklyStateByGoalId.set(state.goalId, state);
    });

    // Build a map of existing weekly goals in the target quarter (for idempotent migration)
    const existingWeeklyGoalsMap = await buildExistingGoalsMap(
      ctx,
      userId,
      to.year,
      to.quarter,
      1 // depth 1 = weekly
    );

    // Create map to track new weekly goal IDs (source ID -> target ID)
    const weeklyGoalIdMap = new Map<Id<'goals'>, Id<'goals'>>();

    // Track how many weekly goals were created vs reused
    let weeklyGoalsCreated = 0;
    let weeklyGoalsReused = 0;

    // Copy each incomplete weekly goal in parallel
    const weeklyGoalPromises = deduplicatedWeeklyGoals.map(async (weeklyGoal) => {
      // Check if this weekly goal already exists in the target quarter
      const weeklyRootGoalId = weeklyGoal.carryOver?.fromGoal?.rootGoalId ?? weeklyGoal._id;
      const existingWeeklyGoal = existingWeeklyGoalsMap.get(weeklyRootGoalId.toString());

      let newWeeklyGoalId: Id<'goals'>;

      if (existingWeeklyGoal && existingWeeklyGoal.parentId === newQuarterlyGoalId) {
        // Reuse the existing weekly goal (only if it has the correct parent)
        // We check parentId to handle the case where a goal with the same rootGoalId
        // exists under a different parent (e.g., migrated to a different quarterly goal).
        // In that case, we create a new goal with the correct parent relationship.
        newWeeklyGoalId = existingWeeklyGoal._id;
        weeklyGoalsReused++;
      } else if (existingWeeklyGoal && existingWeeklyGoal.parentId !== newQuarterlyGoalId) {
        // Goal exists but under a different parent - log for debugging and create new
        console.warn(
          `[moveQuarterlyGoal] Weekly goal with rootGoalId ${weeklyRootGoalId} exists ` +
            `but has different parent (existing: ${existingWeeklyGoal.parentId}, expected: ${newQuarterlyGoalId}). ` +
            `Creating new goal with correct parent.`
        );
        newWeeklyGoalId = await createGoalWithCarryOver({
          ctx,
          userId,
          sourceGoal: weeklyGoal,
          target: to,
          parentId: newQuarterlyGoalId,
          depth: GoalDepth.WEEKLY,
          inPath: `/${newQuarterlyGoalId}`,
        });
        weeklyGoalsCreated++;

        // Create a goal state for the first week using the shared helper
        await createGoalState({
          ctx,
          userId,
          goalId: newWeeklyGoalId,
          year: to.year,
          quarter: to.quarter,
          weekNumber: startWeek,
        });
      } else {
        // Create the new weekly goal using the shared helper
        newWeeklyGoalId = await createGoalWithCarryOver({
          ctx,
          userId,
          sourceGoal: weeklyGoal,
          target: to,
          parentId: newQuarterlyGoalId,
          depth: GoalDepth.WEEKLY,
          inPath: `/${newQuarterlyGoalId}`,
        });
        weeklyGoalsCreated++;

        // Create a goal state for the first week using the shared helper
        await createGoalState({
          ctx,
          userId,
          goalId: newWeeklyGoalId,
          year: to.year,
          quarter: to.quarter,
          weekNumber: startWeek,
        });
      }

      // Store the mapping from old ID to new ID
      weeklyGoalIdMap.set(weeklyGoal._id, newWeeklyGoalId);

      return {
        originalId: weeklyGoal._id,
        newId: newWeeklyGoalId,
        wasReused: !!existingWeeklyGoal,
      };
    });

    // Wait for all weekly goals to be created
    await Promise.all(weeklyGoalPromises);

    if (weeklyGoalsReused > 0) {
      console.log(
        `[moveQuarterlyGoal] Weekly goals: ${weeklyGoalsCreated} created, ${weeklyGoalsReused} reused`
      );
    }

    // Get daily goals from the max week that belong to our weekly goals
    // Query daily goals (depth 2) that are children of our weekly goals
    const weeklyGoalIdSet = new Set(deduplicatedWeeklyGoals.map((g) => g._id));

    // Get all daily goals that are children of our weekly goals
    // Note: We filter by depth=2 after the index scan. This is acceptable because:
    // 1. Convex runs in the database, making N+1 queries efficient
    // 2. Goal counts per quarter are typically < 1000, so full scan is fast
    // 3. Adding a by_user_year_quarter_depth index is an option if this becomes a bottleneck
    const allDailyGoalsForWeeklyGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) =>
        q.eq('userId', userId).eq('year', from.year).eq('quarter', from.quarter)
      )
      .filter((q) => q.eq(q.field('depth'), 2))
      .collect();

    // Filter to only include daily goals that belong to our weekly goals
    const dailyGoalsForOurWeeklyGoals = allDailyGoalsForWeeklyGoals.filter(
      (goal) => goal.parentId !== undefined && weeklyGoalIdSet.has(goal.parentId)
    );

    // Get the daily goal IDs as a Set for O(1) lookup
    const dailyGoalIdsSet = new Set(dailyGoalsForOurWeeklyGoals.map((g) => g._id));

    // Get all goal states for the max week, then filter in-memory
    // This avoids the potential performance issue with large .or() chains
    const allStatesInMaxWeek =
      dailyGoalsForOurWeeklyGoals.length > 0
        ? await ctx.db
            .query('goalStateByWeek')
            .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
              q
                .eq('userId', userId)
                .eq('year', from.year)
                .eq('quarter', from.quarter)
                .eq('weekNumber', lastNonEmptyWeek)
            )
            .collect()
        : [];

    // Filter in-memory to only include states for our daily goals
    const dailyGoalStatesInMaxWeek = allStatesInMaxWeek.filter((state) =>
      dailyGoalIdsSet.has(state.goalId)
    );

    // Get the set of daily goal IDs that have states in the max week
    const dailyGoalIdsInMaxWeek = new Set(dailyGoalStatesInMaxWeek.map((state) => state.goalId));

    // Filter daily goals to only those that have a state in the max week and are incomplete
    const dailyGoalsInMaxWeek = dailyGoalsForOurWeeklyGoals.filter(
      (goal) => dailyGoalIdsInMaxWeek.has(goal._id) && !goal.isComplete
    );

    // Create a map of state by goalId for getting day of week info
    const dailyStateByGoalId = new Map<Id<'goals'>, Doc<'goalStateByWeek'>>();
    dailyGoalStatesInMaxWeek.forEach((state) => {
      dailyStateByGoalId.set(state.goalId, state);
    });

    // Deduplicate daily goals by rootGoalId using the shared helper
    const deduplicatedDailyGoals = deduplicateByRootGoalId(dailyGoalsInMaxWeek);

    // Build a map of existing daily goals in the target quarter (for idempotent migration)
    const existingDailyGoalsMap = await buildExistingGoalsMap(
      ctx,
      userId,
      to.year,
      to.quarter,
      2 // depth 2 = daily
    );

    // Track how many daily goals were created vs reused
    let dailyGoalsCreated = 0;
    let dailyGoalsReused = 0;

    // Process all daily goals in parallel
    const dailyGoalPromises = deduplicatedDailyGoals.map(async (dailyGoal) => {
      // Get the parent weekly goal's new ID
      const newWeeklyGoalId = weeklyGoalIdMap.get(dailyGoal.parentId!);
      if (!newWeeklyGoalId) {
        // This should not happen if the data is consistent, but log for debugging
        console.warn(
          `[moveQuarterlyGoal] Skipping daily goal ${dailyGoal._id}: parent weekly goal ${dailyGoal.parentId} not found in mapping. ` +
            `This may indicate the parent weekly goal was filtered out (e.g., already complete).`
        );
        return;
      }

      // Check if this daily goal already exists in the target quarter
      const dailyRootGoalId = dailyGoal.carryOver?.fromGoal?.rootGoalId ?? dailyGoal._id;
      const existingDailyGoal = existingDailyGoalsMap.get(dailyRootGoalId.toString());

      if (existingDailyGoal && existingDailyGoal.parentId === newWeeklyGoalId) {
        // Reuse the existing daily goal (only if it has the correct parent)
        // We check parentId to handle the case where a goal with the same rootGoalId
        // exists under a different parent (e.g., migrated to a different weekly goal).
        // In that case, we create a new goal with the correct parent relationship.
        dailyGoalsReused++;
        return;
      }

      if (existingDailyGoal && existingDailyGoal.parentId !== newWeeklyGoalId) {
        // Goal exists but under a different parent - log for debugging
        console.warn(
          `[moveQuarterlyGoal] Daily goal with rootGoalId ${dailyRootGoalId} exists ` +
            `but has different parent (existing: ${existingDailyGoal.parentId}, expected: ${newWeeklyGoalId}). ` +
            `Creating new goal with correct parent.`
        );
      }

      // Get the state for this daily goal to get day of week
      const dailyState = dailyStateByGoalId.get(dailyGoal._id);

      // Create the new daily goal using the shared helper
      const newDailyGoalId = await createGoalWithCarryOver({
        ctx,
        userId,
        sourceGoal: dailyGoal,
        target: to,
        parentId: newWeeklyGoalId,
        depth: GoalDepth.DAILY,
        inPath: `/${newQuarterlyGoalId}/${newWeeklyGoalId}`,
      });
      dailyGoalsCreated++;

      // Create a goal state for this daily goal using the shared helper
      // Note: Default to Monday (day 1) if no day info exists. This is acceptable because:
      // 1. Most users start their week on Monday
      // 2. User can reassign the day after migration if needed
      // 3. Having a day assignment is required for the goal to appear in the UI
      await createGoalState({
        ctx,
        userId,
        goalId: newDailyGoalId,
        year: to.year,
        quarter: to.quarter,
        weekNumber: startWeek,
        daily: dailyState?.daily || { dayOfWeek: 1 },
      });
    });

    // Wait for all daily goal processing to complete
    await Promise.all(dailyGoalPromises);

    if (dailyGoalsReused > 0) {
      console.log(
        `[moveQuarterlyGoal] Daily goals: ${dailyGoalsCreated} created, ${dailyGoalsReused} reused`
      );
    }

    return {
      newGoalId: newQuarterlyGoalId,
      weeklyGoalsMigrated: weeklyGoalsCreated,
      weeklyGoalsReused,
      dailyGoalsMigrated: dailyGoalsCreated,
      dailyGoalsReused,
      quarterlyGoalWasCreated,
    };
  },
});

/**
 * Result of moving a weekly goal to a target week.
 * Contains success status, new goal ID, and target week information.
 */
export type MoveWeeklyGoalResult = {
  /** Whether the move operation completed successfully */
  success: boolean;
  /** ID of the newly created goal in the target week */
  newGoalId: Id<'goals'>;
  /** Target week information where the goal was moved */
  targetWeek: {
    year: number;
    quarter: number;
    weekNumber: number;
  };
};

/**
 * Moves or copies a weekly goal to a specific week within the same quarter.
 * Supports two modes based on child goal completion status:
 * - move_all: Moves the weekly goal and all incomplete children (or all if no completed children)
 * - copy_children: Copies the weekly goal to target week, moves only incomplete children, preserves completed children in original week
 *
 * Daily goals are reset to Monday in the destination week to avoid stale day assignments.
 *
 * @param ctx - Convex mutation context
 * @param args - Mutation arguments containing session, goal ID, current week, and target week
 * @returns Promise resolving to move result with new goal ID and target week info
 *
 * @example
 * ```typescript
 * const result = await moveWeeklyGoalToWeek(ctx, {
 *   sessionId: "session123",
 *   goalId: "goal456",
 *   currentWeek: { year: 2024, quarter: 3, weekNumber: 42 },
 *   targetWeek: { year: 2024, quarter: 3, weekNumber: 43 }
 * });
 * // Returns: { success: true, newGoalId: "goal789", targetWeek: {...} }
 * ```
 */
export const moveWeeklyGoalToWeek = mutation({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    currentWeek: v.object({
      year: v.number(),
      quarter: v.number(),
      weekNumber: v.number(),
    }),
    targetWeek: v.object({
      year: v.number(),
      quarter: v.number(),
      weekNumber: v.number(),
    }),
  },
  handler: async (ctx, args): Promise<MoveWeeklyGoalResult> => {
    const { sessionId, goalId, currentWeek, targetWeek } = args;

    // Auth check
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get the goal
    const goal = await ctx.db.get('goals', goalId);
    if (!goal) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Goal not found',
      });
    }

    // Verify ownership
    if (goal.userId !== userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You do not have permission to move this goal',
      });
    }

    // Verify it's a weekly goal
    if (goal.depth !== 1) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Only weekly goals can be moved to next week',
      });
    }

    // Check for child goals
    const childGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter_and_parent', (q) =>
        q
          .eq('userId', userId)
          .eq('year', goal.year)
          .eq('quarter', goal.quarter)
          .eq('parentId', goalId)
      )
      .collect();

    // Validate target week is within the same quarter
    const { weeks } = getQuarterWeeks(currentWeek.year, currentWeek.quarter);
    if (!weeks.includes(targetWeek.weekNumber)) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: `Target week ${targetWeek.weekNumber} is not within quarter ${currentWeek.quarter}`,
      });
    }

    const targetYear = targetWeek.year;
    const targetQuarter = targetWeek.quarter;
    const targetWeekNumber = targetWeek.weekNumber;

    // Get or create the parent quarterly goal in the target quarter
    let targetParentId = goal.parentId;

    // If moving to a different quarter, we need to handle the parent
    if (targetQuarter !== goal.quarter || targetYear !== goal.year) {
      if (goal.parentId) {
        const parentGoal = await ctx.db.get('goals', goal.parentId);
        if (parentGoal) {
          // Check if parent exists in target quarter
          const existingParentInTargetQuarter = await ctx.db
            .query('goals')
            .withIndex('by_user_and_year_and_quarter', (q) =>
              q.eq('userId', userId).eq('year', targetYear).eq('quarter', targetQuarter)
            )
            .filter((q) =>
              q.and(q.eq(q.field('depth'), 0), q.eq(q.field('title'), parentGoal.title))
            )
            .first();

          if (existingParentInTargetQuarter) {
            targetParentId = existingParentInTargetQuarter._id;
          } else {
            // Create the parent in the new quarter
            targetParentId = await ctx.db.insert('goals', {
              userId,
              year: targetYear,
              quarter: targetQuarter,
              title: parentGoal.title,
              details: parentGoal.details,
              inPath: '/',
              depth: 0,
              isComplete: false,
            });

            // Create goal state for the parent in all weeks of the new quarter
            const { weeks: allTargetWeeks } = getQuarterWeeks(targetYear, targetQuarter);
            const newParentId = targetParentId;
            await Promise.all(
              allTargetWeeks.map((weekNum) =>
                ctx.db.insert('goalStateByWeek', {
                  userId,
                  year: targetYear,
                  quarter: targetQuarter,
                  goalId: newParentId,
                  weekNumber: weekNum,
                  isStarred: false,
                  isPinned: false,
                })
              )
            );
          }
        } else {
          // Parent doesn't exist, create as standalone
          targetParentId = undefined;
        }
      }
    }

    const hasChildren = childGoals.length > 0;
    const hasCompletedChildren = childGoals.some((child) => child.isComplete);
    const moveMode = !hasChildren || !hasCompletedChildren ? 'move_all' : 'copy_children';

    // Helper to create destination weekly goal
    const createDestinationWeeklyGoal = async (): Promise<Id<'goals'>> => {
      const inPath = targetParentId ? joinPath('/', targetParentId) : '/';
      if (!validateGoalPath(1, inPath)) {
        throw new ConvexError({
          code: 'INVALID_STATE',
          message: `Invalid path "${inPath}" for weekly goal`,
        });
      }

      return ctx.db.insert('goals', {
        userId,
        year: targetYear,
        quarter: targetQuarter,
        title: goal.title,
        details: goal.details,
        parentId: targetParentId,
        inPath,
        depth: 1,
        isComplete: false,
      });
    };

    const destinationGoalId = await createDestinationWeeklyGoal();

    await ctx.db.insert('goalStateByWeek', {
      userId,
      year: targetYear,
      quarter: targetQuarter,
      goalId: destinationGoalId,
      weekNumber: targetWeekNumber,
      isStarred: false,
      isPinned: false,
    });

    const childStatesByGoalId = new Map<Id<'goals'>, Doc<'goalStateByWeek'>>();
    if (childGoals.length > 0) {
      const childGoalIds = childGoals.map((child) => child._id);
      const childGoalStates = await ctx.db
        .query('goalStateByWeek')
        .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
          q
            .eq('userId', userId)
            .eq('year', currentWeek.year)
            .eq('quarter', currentWeek.quarter)
            .eq('weekNumber', currentWeek.weekNumber)
        )
        .filter((q) => q.or(...childGoalIds.map((goalId) => q.eq(q.field('goalId'), goalId))))
        .collect();

      childGoalStates.forEach((state) => {
        childStatesByGoalId.set(state.goalId, state);
      });
    }

    /**
     * Moves a child goal to the destination week, resetting day of week to Monday.
     * Updates both the goal record and its weekly state.
     *
     * @param childGoal - The child goal to move
     */
    const _moveChildGoal = async (childGoal: Doc<'goals'>) => {
      const childState = childStatesByGoalId.get(childGoal._id);

      const childQuarterlyParentId = targetParentId;
      const childInPath = childQuarterlyParentId
        ? joinPath('/', childQuarterlyParentId, destinationGoalId)
        : joinPath('/', destinationGoalId);

      if (!validateGoalPath(2, childInPath)) {
        throw new ConvexError({
          code: 'INVALID_STATE',
          message: `Invalid path "${childInPath}" for daily goal`,
        });
      }

      await ctx.db.patch('goals', childGoal._id, {
        parentId: destinationGoalId,
        year: targetYear,
        quarter: targetQuarter,
        inPath: childInPath,
      });

      if (childState) {
        await ctx.db.patch('goalStateByWeek', childState._id, {
          year: targetYear,
          quarter: targetQuarter,
          weekNumber: targetWeekNumber,
          goalId: childGoal._id,
          // Reset day of week to Monday when moving daily goals
          daily: childState.daily
            ? {
                ...childState.daily,
                dayOfWeek: DayOfWeek.MONDAY,
              }
            : undefined,
        });
      } else {
        await ctx.db.insert('goalStateByWeek', {
          userId,
          year: targetYear,
          quarter: targetQuarter,
          weekNumber: targetWeekNumber,
          goalId: childGoal._id,
          isStarred: false,
          isPinned: false,
          // Default to Monday for moved daily goals
          daily: {
            dayOfWeek: DayOfWeek.MONDAY,
          },
        });
      }
    };

    if (moveMode === 'move_all') {
      await Promise.all(childGoals.map(_moveChildGoal));

      const originalStates = await ctx.db
        .query('goalStateByWeek')
        .withIndex('by_user_and_goal_and_year_and_quarter_and_week', (q) =>
          q.eq('userId', userId).eq('goalId', goal._id)
        )
        .collect();
      await Promise.all(originalStates.map((state) => ctx.db.delete('goalStateByWeek', state._id)));

      await ctx.db.delete('goals', goal._id);
    } else {
      const incompleteChildGoals = childGoals.filter((child) => !child.isComplete);
      await ctx.db.patch('goals', goal._id, {
        isComplete: false,
        year: currentWeek.year,
        quarter: currentWeek.quarter,
      });
      await Promise.all(incompleteChildGoals.map(_moveChildGoal));
    }

    return {
      success: true,
      newGoalId: destinationGoalId,
      targetWeek: {
        year: targetYear,
        quarter: targetQuarter,
        weekNumber: targetWeekNumber,
      },
    };
  },
});

/**
 * Result type for updateGoalParent mutation.
 */
export type UpdateGoalParentResult = {
  success: boolean;
  error?: string;
};

/**
 * Updates the parent of a goal (reparenting).
 * Used to move a weekly goal to a different quarterly goal.
 * The goal remains in the same year/quarter but changes its parent hierarchy.
 *
 * @param ctx - Convex mutation context
 * @param args - Mutation arguments containing session, goal ID, and new parent ID
 * @returns Promise resolving to update result
 *
 * @example
 * ```typescript
 * const result = await updateGoalParent(ctx, {
 *   sessionId: "session123",
 *   goalId: "weekly-goal-456",
 *   newParentId: "quarterly-goal-789"
 * });
 * // Returns: { success: true }
 * ```
 */
export const updateGoalParent = mutation({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    newParentId: v.id('goals'),
  },
  handler: async (ctx, args): Promise<UpdateGoalParentResult> => {
    const { sessionId, goalId, newParentId } = args;

    // Auth check
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get the goal to reparent
    const goal = await ctx.db.get('goals', goalId);
    if (!goal) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Goal not found',
      });
    }

    // Verify ownership
    if (goal.userId !== userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You do not have permission to modify this goal',
      });
    }

    // Get the new parent goal
    const newParent = await ctx.db.get('goals', newParentId);
    if (!newParent) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'New parent goal not found',
      });
    }

    // Verify new parent ownership
    if (newParent.userId !== userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You do not have permission to reparent to this goal',
      });
    }

    // Verify the goal is a weekly goal (depth 1)
    if (goal.depth !== 1) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Only weekly goals can be reparented to a different quarterly goal',
      });
    }

    // Verify the new parent is a quarterly goal (depth 0)
    if (newParent.depth !== 0) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Goals can only be reparented to quarterly goals',
      });
    }

    // Verify same year and quarter
    if (goal.year !== newParent.year || goal.quarter !== newParent.quarter) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Goal and new parent must be in the same year and quarter',
      });
    }

    // Don't allow reparenting to the same parent
    if (goal.parentId === newParentId) {
      return { success: true }; // No-op, already has this parent
    }

    // Calculate new inPath based on new parent
    const newInPath = joinPath(newParent.inPath, newParentId);

    // Update the goal with new parent and path
    await ctx.db.patch('goals', goalId, {
      parentId: newParentId,
      inPath: newInPath,
    });

    // Also update any child goals (daily goals under this weekly goal)
    const childGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter_and_parent', (q) =>
        q
          .eq('userId', userId)
          .eq('year', goal.year)
          .eq('quarter', goal.quarter)
          .eq('parentId', goalId)
      )
      .collect();

    // Update children's inPath to reflect new hierarchy
    for (const child of childGoals) {
      const childNewInPath = joinPath(newInPath, goalId);
      await ctx.db.patch('goals', child._id, {
        inPath: childNewInPath,
      });
    }

    return { success: true };
  },
});

// ============================================================================
// INTERNAL QUERIES (for actions that need to look up data)
// ============================================================================

/**
 * Internal query to look up a session by its sessionId string field.
 */
export const getSessionBySessionId = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();
  },
});

/**
 * Internal query to look up a user by ID.
 */
export const getUserById = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get('users', args.userId);
  },
});
