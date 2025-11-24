import { ConvexError, v } from 'convex/values';
import { DateTime } from 'luxon';
import { DayOfWeek, getDayName } from '../src/constants';
import {
  moveGoalsFromLastNonEmptyWeekUsecase,
  moveGoalsFromWeekUsecase,
} from '../src/usecase/moveGoalsFromWeek/moveGoalsFromWeek';
import {
  debugQuarterCalculations,
  getFinalWeeksOfQuarter,
  getFirstWeekOfQuarter,
  getQuarterWeeks,
} from '../src/usecase/quarter';
import { requireLogin } from '../src/usecase/requireLogin';
import { getNextPath, joinPath, validateGoalPath } from '../src/util/path';
import { api, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server';

export const moveGoalsFromWeek = mutation({
  args: {
    sessionId: v.id('sessions'),
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
    sessionId: v.id('sessions'),
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
    sessionId: v.id('sessions'),
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
    sessionId: v.id('sessions'),
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
        const goal = await ctx.db.get(weeklyGoal.goalId);
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
        const dailyGoal = await ctx.db.get(weeklyGoal.goalId);
        if (!dailyGoal || dailyGoal.userId !== userId) return null;

        const weeklyParent = await ctx.db.get(dailyGoal?.parentId as Id<'goals'>);
        if (!weeklyParent || weeklyParent.userId !== userId) return null;

        const quarterlyParent = await ctx.db.get(weeklyParent?.parentId as Id<'goals'>);
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
          await ctx.db.patch(task.weeklyGoalState._id, {
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
          await ctx.db.patch(task.weeklyGoalState._id, {
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
    sessionId: v.id('sessions'),
    goalId: v.id('goals'),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId, dryRun = false } = args;
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
    await Promise.all(goalStates.map((state) => ctx.db.delete(state._id)));

    // Then delete the goals themselves
    await Promise.all(goalIds.map((id) => ctx.db.delete(id)));

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
    const existingGoals = await Promise.all(uniqueGoalIds.map((id) => ctx.db.get(id)));

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
    await Promise.all(orphanedStates.map((state) => ctx.db.delete(state._id)));

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

type MoveQuarterlyGoalResult = {
  newGoalId: Id<'goals'>;
  weeklyGoalsMigrated: number;
  error?: string;
};

// Replace the existing moveGoalsFromQuarter mutation with an action
export const moveGoalsFromQuarter = action({
  args: {
    sessionId: v.id('sessions'),
    from: v.object({
      year: v.number(),
      quarter: v.number(),
    }),
    to: v.object({
      year: v.number(),
      quarter: v.number(),
    }),
    dryRun: v.optional(v.boolean()),
    debug: v.optional(v.boolean()),
  },
  // biome-ignore lint/suspicious/noExplicitAny: Complex return type varies based on dryRun flag
  handler: async (ctx, args): Promise<any> => {
    const { sessionId, from, to, dryRun = false, debug = false } = args;
    // Auth check
    const user = await ctx.runQuery(api.auth.getUser, { sessionId });
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

    // Debug log information about the quarters and weeks if debug flag is set
    if (debug) {
      const fromDateInfo = debugQuarterCalculations(
        DateTime.local(from.year, (from.quarter - 1) * 3 + 1, 1)
      );
      const toDateInfo = debugQuarterCalculations(
        DateTime.local(to.year, (to.quarter - 1) * 3 + 1, 1)
      );

      console.log('FROM QUARTER:', fromDateInfo.calendarInfo);
      console.log('FROM QUARTER FINAL WEEKS:', fromDateInfo.currentQuarter.finalWeeks);
      console.log('TO QUARTER:', toDateInfo.calendarInfo);
      console.log('TO QUARTER FIRST WEEK:', getFirstWeekOfQuarter(to.year, to.quarter));
    }

    // === STAGE 1: Query only for incomplete quarterly goals from the previous quarter ===
    // Get all quarterly goals from the source quarter
    const quarterlyGoals = await ctx.runQuery(internal.goal.getIncompleteQuarterlyGoals, {
      userId,
      year: from.year,
      quarter: from.quarter,
    });

    // Get incomplete adhoc goals from the source quarter
    const adhocGoals = await ctx.runQuery(internal.goal.getIncompleteAdhocGoalsForQuarter, {
      userId,
      year: from.year,
      quarter: from.quarter,
    });

    if (dryRun) {
      return {
        quarterlyGoalsToCopy: quarterlyGoals,
        adhocGoalsToCopy: adhocGoals,
        isDryRun: true,
      };
    }

    // === STAGE 2: If not a dry run, migrate each goal SEQUENTIALLY ===
    const migrationResults = [];
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
      quarterlyGoalsToCopy: quarterlyGoals,
      adhocGoalsToCopy: adhocGoals,
      results: migrationResults,
      quarterlyGoalsCopied: migrationResults.filter(
        (r: MoveQuarterlyGoalResult | { error: string }) => !('error' in r)
      ).length,
      adhocGoalsMoved,
    };
  },
});

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

    // Get the final weeks of the source quarter
    const finalWeeksOfSourceQuarter = getFinalWeeksOfQuarter(year, quarter);

    // Get all week numbers for this quarter
    const weekNumbers = finalWeeksOfSourceQuarter.map((w) => w.weekNumber);

    // Query all adhoc goals for this user in any of the quarter's weeks
    const allAdhocGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) =>
        q.eq('userId', userId).eq('year', year).eq('quarter', quarter)
      )
      .filter((q) => q.neq(q.field('adhoc'), undefined))
      .collect();

    // Filter to only incomplete adhoc goals that are in this quarter's weeks
    const incompleteAdhocGoals = allAdhocGoals.filter((goal) => {
      if (goal.isComplete) return false;
      if (!goal.adhoc) return false;
      return weekNumbers.includes(goal.adhoc.weekNumber);
    });

    // Get domain information for these goals
    const domainIds = [
      ...new Set(
        incompleteAdhocGoals
          .map((goal) => goal.domainId || goal.adhoc?.domainId)
          .filter(Boolean) as Id<'domains'>[]
      ),
    ];
    const domains = await Promise.all(domainIds.map((id) => ctx.db.get(id)));
    const domainMap = new Map(
      domains.filter((d): d is Doc<'domains'> => d !== null).map((domain) => [domain._id, domain])
    );

    // Format response data
    return incompleteAdhocGoals.map((goal) => {
      const effectiveDomainId = goal.domainId || goal.adhoc?.domainId;
      return {
        id: goal._id,
        title: goal.title,
        details: goal.details,
        domainId: effectiveDomainId,
        domainName: effectiveDomainId ? domainMap.get(effectiveDomainId)?.name : undefined,
        dayOfWeek: goal.adhoc?.dayOfWeek,
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
        const goal = await ctx.db.get(goalId);
        if (!goal || goal.userId !== userId || !goal.adhoc) return;

        await ctx.db.patch(goalId, {
          year: to.year,
          quarter: to.quarter,
          adhoc: {
            ...goal.adhoc,
            year: firstWeekInfo.year,
            weekNumber: firstWeekInfo.weekNumber,
          },
        });

        // Update adhoc goal state
        const state = await ctx.db
          .query('adhocGoalStates')
          .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
          .first();

        if (state) {
          await ctx.db.patch(state._id, {
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
    sessionId: v.id('sessions'),
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
  handler: async (ctx, args): Promise<MoveQuarterlyGoalResult> => {
    const { sessionId, goalId, from, to } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the quarterly goal and verify ownership
    const quarterlyGoal = await ctx.db.get(goalId);
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
    // Get the final weeks of the source quarter for filtering weekly goals
    const finalWeeksOfSourceQuarter = getFinalWeeksOfQuarter(from.year, from.quarter);

    // Find the latest week number from final weeks
    const latestWeek = finalWeeksOfSourceQuarter.reduce(
      (latest, week) => Math.max(latest, week.weekNumber),
      0
    );
    // Get quarterly goal states to check starred/pinned status
    const quarterlyGoalStates = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_goal_and_year_and_quarter_and_week', (q) =>
        q
          .eq('userId', userId)
          .eq('goalId', goalId)
          .eq('year', from.year)
          .eq('quarter', from.quarter)
          .eq('weekNumber', latestWeek)
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

    // Create a new quarterly goal in the target quarter
    const newQuarterlyGoalId = await ctx.db.insert('goals', {
      userId,
      year: to.year,
      quarter: to.quarter,
      title: quarterlyGoal.title,
      details: quarterlyGoal.details,
      inPath: '/',
      depth: 0, // Quarterly goals have depth 0
      isComplete: false,
      // Add a reference to the original goal
      carryOver: {
        type: 'week',
        numWeeks: 1,
        fromGoal: {
          previousGoalId: quarterlyGoal._id,
          rootGoalId: quarterlyGoal._id,
        },
      },
    });

    // Create goal states for all weeks in the new quarter
    const weekStatePromises = [];
    for (const weekNum of weeks) {
      weekStatePromises.push(
        ctx.db.insert('goalStateByWeek', {
          userId,
          year: to.year,
          quarter: to.quarter,
          goalId: newQuarterlyGoalId,
          weekNumber: weekNum,
          // Keep the original starred/pinned status on the first state
          isStarred: weekNum === startWeek ? firstState?.isStarred || false : false,
          isPinned: weekNum === startWeek ? firstState?.isPinned || false : false,
        })
      );
    }

    await Promise.all(weekStatePromises);

    // Find all weekly goals for this quarterly goal
    const weeklyGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) =>
        q.eq('userId', userId).eq('year', from.year).eq('quarter', from.quarter)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field('depth'), 1), // Weekly goals have depth 1
          q.eq(q.field('parentId'), goalId)
        )
      )
      .collect();

    // Create map to track new weekly goal IDs
    const weeklyGoalIdMap = new Map<Id<'goals'>, Id<'goals'>>();

    // Find states for weekly goals in the latest week
    const weeklyGoalIds = weeklyGoals.map((goal) => goal._id);
    const weeklyGoalStates = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_year_and_quarter_and_week_and_daily', (q) =>
        q
          .eq('userId', userId)
          .eq('year', from.year)
          .eq('quarter', from.quarter)
          .eq('weekNumber', latestWeek)
      )
      .filter((q) => q.or(...weeklyGoalIds.map((id) => q.eq(q.field('goalId'), id))))
      .collect();
    // Create a map of goalId -> latest state to handle any duplicates
    const _latestStateByGoalId = weeklyGoalStates.reduce(
      (acc, state) => {
        const existing = acc[state.goalId];
        if (!existing || existing._creationTime < state._creationTime) {
          acc[state.goalId] = state;
        }
        return acc;
      },
      {} as Record<Id<'goals'>, Doc<'goalStateByWeek'>>
    );

    // Get full details for each weekly goal including whether they're complete
    const goalsWithCompletion = await Promise.all(
      weeklyGoals.map(async (goal) => {
        return goal;
      })
    );

    // Filter for incomplete weekly goals based on direct completion status
    const incompleteWeeklyGoals = goalsWithCompletion.filter((goal) => !goal.isComplete);

    // Copy each incomplete weekly goal in parallel
    const weeklyGoalPromises = incompleteWeeklyGoals.map(async (weeklyGoal) => {
      // Create the new weekly goal
      const newWeeklyGoalId = await ctx.db.insert('goals', {
        userId,
        year: to.year,
        quarter: to.quarter,
        title: weeklyGoal.title,
        details: weeklyGoal.details,
        inPath: `/${newQuarterlyGoalId}`,
        parentId: newQuarterlyGoalId,
        depth: 1, // Weekly goals have depth 1
        isComplete: false,
        // Add a reference to the original goal
        carryOver: {
          type: 'week',
          numWeeks: 1,
          fromGoal: {
            previousGoalId: weeklyGoal._id,
            rootGoalId: weeklyGoal._id,
          },
        },
      });

      // Store the mapping from old ID to new ID
      weeklyGoalIdMap.set(weeklyGoal._id, newWeeklyGoalId);

      // Create a goal state for the first week
      await ctx.db.insert('goalStateByWeek', {
        userId,
        year: to.year,
        quarter: to.quarter,
        goalId: newWeeklyGoalId,
        weekNumber: startWeek, // Use the first week of the quarter
        isStarred: false,
        isPinned: false,
      });

      return { originalId: weeklyGoal._id, newId: newWeeklyGoalId };
    });

    // Wait for all weekly goals to be created
    await Promise.all(weeklyGoalPromises);

    // Process daily goals in parallel for each weekly goal
    const dailyGoalPromises = incompleteWeeklyGoals.map(async (weeklyGoal) => {
      // Get the new weekly goal ID
      const newWeeklyGoalId = weeklyGoalIdMap.get(weeklyGoal._id);
      if (!newWeeklyGoalId) return;

      // Find all daily goals for this weekly goal
      const dailyGoals = await ctx.db
        .query('goals')
        .withIndex('by_user_and_year_and_quarter', (q) =>
          q.eq('userId', userId).eq('year', from.year).eq('quarter', from.quarter)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field('depth'), 2), // Daily goals have depth 2
            q.eq(q.field('parentId'), weeklyGoal._id)
          )
        )
        .collect();

      // Get full details for each daily goal including whether they're complete
      const dailyGoalsWithCompletion = await Promise.all(
        dailyGoals.map(async (goal) => {
          return goal;
        })
      );

      // Filter for incomplete daily goals based on direct completion status
      const incompleteDailyGoals = dailyGoalsWithCompletion.filter((goal) => !goal.isComplete);

      // Find states for daily goals to get the day of week
      const dailyGoalIds = incompleteDailyGoals.map((goal) => goal._id);
      if (dailyGoalIds.length === 0) return;

      const dailyGoalStates = await ctx.db
        .query('goalStateByWeek')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', userId))
        .filter((q) =>
          q.and(
            q.or(...dailyGoalIds.map((id) => q.eq(q.field('goalId'), id))),
            q.eq(q.field('weekNumber'), latestWeek),
            q.eq(q.field('year'), from.year)
          )
        )
        .collect();

      // Create a map of goalId -> latest state to get day information
      const dailyStateMap = new Map();
      dailyGoalStates.forEach((state) => {
        const goalId = state.goalId;
        // If we haven't seen this goal yet, add its state
        if (!dailyStateMap.has(goalId)) {
          dailyStateMap.set(goalId, state);
        } else {
          // If we already have a state for this goal
          const existingState = dailyStateMap.get(goalId);
          if (existingState.weekNumber < state.weekNumber) {
            // Keep the one with the higher week number
            dailyStateMap.set(goalId, state);
          } else if (existingState.weekNumber === state.weekNumber) {
            // If same week number, keep the one with the more recent _creationTime
            if (existingState._creationTime < state._creationTime) {
              dailyStateMap.set(goalId, state);
            }
          }
        }
      });

      // Process all daily goals for this weekly goal in parallel
      const innerDailyGoalPromises = incompleteDailyGoals.map(async (dailyGoal) => {
        // Find state for this daily goal to get day of week
        const dailyState = dailyStateMap.get(dailyGoal._id);

        // Create the new daily goal
        const newDailyGoalId = await ctx.db.insert('goals', {
          userId,
          year: to.year,
          quarter: to.quarter,
          title: dailyGoal.title,
          details: dailyGoal.details,
          inPath: `/${newQuarterlyGoalId}/${newWeeklyGoalId}`,
          parentId: newWeeklyGoalId,
          depth: 2, // Daily goals have depth 2
          isComplete: false,
          // Add a reference to the original goal
          carryOver: {
            type: 'week',
            numWeeks: 1,
            fromGoal: {
              previousGoalId: dailyGoal._id,
              rootGoalId: dailyGoal._id,
            },
          },
        });

        // Create a goal state for this daily goal
        await ctx.db.insert('goalStateByWeek', {
          userId,
          year: to.year,
          quarter: to.quarter,
          goalId: newDailyGoalId,
          weekNumber: startWeek, // Use the first week of the quarter
          isStarred: false,
          isPinned: false,
          // Preserve the day of week if available
          daily: dailyState?.daily || { dayOfWeek: 1 }, // Default to Monday if not specified
        });
      });

      // Wait for all daily goals for this weekly goal to be processed
      await Promise.all(innerDailyGoalPromises);
    });

    // Wait for all daily goal processing to complete
    await Promise.all(dailyGoalPromises);

    return {
      newGoalId: newQuarterlyGoalId,
      weeklyGoalsMigrated: incompleteWeeklyGoals.length,
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
    sessionId: v.id('sessions'),
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
    const goal = await ctx.db.get(goalId);
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
        const parentGoal = await ctx.db.get(goal.parentId);
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

      await ctx.db.patch(childGoal._id, {
        parentId: destinationGoalId,
        year: targetYear,
        quarter: targetQuarter,
        inPath: childInPath,
      });

      if (childState) {
        await ctx.db.patch(childState._id, {
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
      await Promise.all(originalStates.map((state) => ctx.db.delete(state._id)));

      await ctx.db.delete(goal._id);
    } else {
      const incompleteChildGoals = childGoals.filter((child) => !child.isComplete);
      await ctx.db.patch(goal._id, {
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
