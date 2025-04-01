import { v } from 'convex/values';
import { requireLogin } from '../src/usecase/requireLogin';
import { internalMutation, internalQuery, mutation } from './_generated/server';
import { moveGoalsFromWeekUsecase } from '../src/usecase/moveGoalsFromWeek/moveGoalsFromWeek';
import { DayOfWeek, getDayName } from '../src/constants';
import { Id, Doc } from './_generated/dataModel';
import { internal } from './_generated/api';
import { getNextPath, joinPath } from '../src/util/path';
import { ConvexError } from 'convex/values';
import { api } from './_generated/api';
import { DateTime } from 'luxon';

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
        q.and(
          q.neq(q.field('daily'), undefined),
          q.eq(q.field('daily.dayOfWeek'), from.dayOfWeek)
        )
      )
      .collect();

    // Filter to only include incomplete goals if moveOnlyIncomplete is true
    const filteredGoalStates = moveOnlyIncomplete
      ? allGoalStates.filter((weeklyGoal) => !weeklyGoal.isComplete)
      : allGoalStates;

    // Get full details for each goal
    const tasksWithFullDetails = await Promise.all(
      filteredGoalStates.map(async (weeklyGoal) => {
        const dailyGoal = await ctx.db.get(weeklyGoal.goalId);
        if (!dailyGoal || dailyGoal.userId !== userId) return null;

        const weeklyParent = await ctx.db.get(
          dailyGoal?.parentId as Id<'goals'>
        );
        if (!weeklyParent || weeklyParent.userId !== userId) return null;

        const quarterlyParent = await ctx.db.get(
          weeklyParent?.parentId as Id<'goals'>
        );
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
      from.year === to.year &&
      from.quarter === to.quarter &&
      from.weekNumber === to.weekNumber;

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
        .filter((q) =>
          q.or(...goalIds.map((id) => q.eq(q.field('goalId'), id)))
        )
        .collect();

      // Group goal states by goal ID
      const goalStatesByGoalId = goalStates.reduce((acc, state) => {
        if (!acc[state.goalId]) {
          acc[state.goalId] = [];
        }
        acc[state.goalId].push(state);
        return acc;
      }, {} as Record<Id<'goals'>, any[]>);

      // Build a tree structure for the goals with state information
      const { tree: goalsTree } = buildGoalTreeForPreview(
        allGoals,
        goalStatesByGoalId
      );

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
  goalStatesByGoalId: Record<Id<'goals'>, any[]> = {}
) {
  const roots: GoalPreviewNode[] = [];

  // Find the main goal (the one being deleted)
  // This is typically the first goal in the array
  const mainGoal = goals[0];

  // Index all nodes
  const nodeIndex = goals.reduce((acc, goal) => {
    // Get unique weeks for this goal from its states
    const goalStates = goalStatesByGoalId[goal._id] || [];
    const weeks = [
      ...new Set(goalStates.map((state) => state.weekNumber)),
    ].sort((a, b) => a - b);

    const node: GoalPreviewNode = {
      _id: goal._id,
      title: goal.title,
      depth: goal.depth,
      children: [],
      weeks: weeks.length > 0 ? weeks : undefined,
    };
    acc[goal._id] = node;
    return acc;
  }, {} as Record<Id<'goals'>, GoalPreviewNode>);

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
    const existingGoals = await Promise.all(
      uniqueGoalIds.map((id) => ctx.db.get(id))
    );

    // Create a set of existing goal IDs for quick lookup
    const existingGoalIds = new Set(
      existingGoals.filter(Boolean).map((goal) => goal!._id)
    );

    // Find orphaned goal states (where the goal doesn't exist)
    const orphanedStates = goalStates.filter(
      (state) => !existingGoalIds.has(state.goalId)
    );

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

export const moveGoalsFromQuarter = mutation({
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
  },
  handler: async (ctx, args) => {
    const { sessionId, from, to, dryRun = false } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Validate that we're not moving goals to the same quarter
    if (from.year === to.year && from.quarter === to.quarter) {
      throw new ConvexError('Cannot move goals to the same quarter');
    }

    // === STAGE 1: Query for incomplete goals from the previous quarter ===

    // Get all quarterly goals from the source quarter
    const quarterlyGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) =>
        q.eq('userId', userId).eq('year', from.year).eq('quarter', from.quarter)
      )
      .filter((q) => q.eq(q.field('depth'), 0)) // Quarterly goals have depth 0
      .collect();

    // Get the goal states for these quarterly goals to check completion status
    const quarterlyGoalIds = quarterlyGoals.map((goal) => goal._id);
    const quarterlyGoalStates = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_goal', (q) => q.eq('userId', userId))
      .filter((q) =>
        q.or(...quarterlyGoalIds.map((id) => q.eq(q.field('goalId'), id)))
      )
      .collect();

    // Group states by goal ID and check if all weeks are complete
    const quarterlyGoalStateMap = quarterlyGoalIds.reduce((map, goalId) => {
      const states = quarterlyGoalStates.filter(
        (state) => state.goalId === goalId
      );
      const isComplete = states.every((state) => state.isComplete);
      map.set(goalId, { states, isComplete });
      return map;
    }, new Map());

    // Filter for incomplete quarterly goals
    const incompleteQuarterlyGoals = quarterlyGoals.filter(
      (goal) => !quarterlyGoalStateMap.get(goal._id)?.isComplete
    );

    // Get weekly goals that are children of these quarterly goals
    const weeklyGoals: Doc<'goals'>[] = [];
    for (const quarterlyGoal of incompleteQuarterlyGoals) {
      const children = await ctx.db
        .query('goals')
        .withIndex('by_user_and_year_and_quarter', (q) =>
          q
            .eq('userId', userId)
            .eq('year', from.year)
            .eq('quarter', from.quarter)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field('depth'), 1), // Weekly goals have depth 1
            q.eq(q.field('parentId'), quarterlyGoal._id)
          )
        )
        .collect();
      weeklyGoals.push(...children);
    }

    // Get the weekly goal states
    const weeklyGoalIds = weeklyGoals.map((goal) => goal._id);
    const weeklyGoalStates = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_goal', (q) => q.eq('userId', userId))
      .filter((q) =>
        q.or(...weeklyGoalIds.map((id) => q.eq(q.field('goalId'), id)))
      )
      .collect();

    // Group states by goal ID and check completion
    const weeklyGoalStateMap = weeklyGoalIds.reduce((map, goalId) => {
      const states = weeklyGoalStates.filter(
        (state) => state.goalId === goalId
      );
      const isComplete = states.every((state) => state.isComplete);
      map.set(goalId, { states, isComplete });
      return map;
    }, new Map());

    // Filter for incomplete weekly goals
    const incompleteWeeklyGoals = weeklyGoals.filter(
      (goal) => !weeklyGoalStateMap.get(goal._id)?.isComplete
    );

    // Get daily goals that are children of these weekly goals
    const dailyGoals: Doc<'goals'>[] = [];
    for (const weeklyGoal of incompleteWeeklyGoals) {
      const children = await ctx.db
        .query('goals')
        .withIndex('by_user_and_year_and_quarter', (q) =>
          q
            .eq('userId', userId)
            .eq('year', from.year)
            .eq('quarter', from.quarter)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field('depth'), 2), // Daily goals have depth 2
            q.eq(q.field('parentId'), weeklyGoal._id)
          )
        )
        .collect();
      dailyGoals.push(...children);
    }

    // Get the daily goal states
    const dailyGoalIds = dailyGoals.map((goal) => goal._id);
    const dailyGoalStates = await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_goal', (q) => q.eq('userId', userId))
      .filter((q) =>
        q.or(...dailyGoalIds.map((id) => q.eq(q.field('goalId'), id)))
      )
      .collect();

    // Group states by goal ID and check completion
    const dailyGoalStateMap = dailyGoalIds.reduce((map, goalId) => {
      const states = dailyGoalStates.filter((state) => state.goalId === goalId);
      const isComplete = states.every((state) => state.isComplete);
      map.set(goalId, { states, isComplete });
      return map;
    }, new Map());

    // Filter for incomplete daily goals
    const incompleteDailyGoals = dailyGoals.filter(
      (goal) => !dailyGoalStateMap.get(goal._id)?.isComplete
    );

    // === STAGE 2: Format data for response ===

    // Create mappings for IDs to titles
    const quarterlyGoalTitles = new Map(
      incompleteQuarterlyGoals.map((goal) => [goal._id, goal.title])
    );
    const weeklyGoalTitles = new Map(
      incompleteWeeklyGoals.map((goal) => [goal._id, goal.title])
    );

    // Format response data
    const quarterlyGoalsToCopy = incompleteQuarterlyGoals.map((goal) => {
      // Find the first state to get starred/pinned info
      const states = quarterlyGoalStateMap.get(goal._id)?.states || [];
      const firstState = states.length > 0 ? states[0] : null;

      return {
        id: goal._id,
        title: goal.title,
        details: goal.details,
        isStarred: firstState?.isStarred || false,
        isPinned: firstState?.isPinned || false,
      };
    });

    const weeklyGoalsToCopy = incompleteWeeklyGoals.map((goal) => {
      return {
        id: goal._id,
        title: goal.title,
        details: goal.details,
        quarterlyGoalId: goal.parentId as Id<'goals'>,
        quarterlyGoalTitle:
          quarterlyGoalTitles.get(goal.parentId as Id<'goals'>) || 'Unknown',
      };
    });

    const dailyGoalsToCopy = incompleteDailyGoals.map((goal) => {
      const weeklyGoalId = goal.parentId as Id<'goals'>;
      const weeklyGoal = weeklyGoals.find((wg) => wg._id === weeklyGoalId);
      const quarterlyGoalId = weeklyGoal?.parentId as Id<'goals'>;

      return {
        id: goal._id,
        title: goal.title,
        details: goal.details,
        weeklyGoalId,
        weeklyGoalTitle: weeklyGoalTitles.get(weeklyGoalId) || 'Unknown',
        quarterlyGoalId,
        quarterlyGoalTitle:
          quarterlyGoalTitles.get(quarterlyGoalId) || 'Unknown',
      };
    });

    if (dryRun) {
      return {
        quarterlyGoalsToCopy,
        weeklyGoalsToCopy,
        dailyGoalsToCopy,
        isDryRun: true,
      };
    }

    // === STAGE 3: If not a dry run, actually copy the goals to the new quarter ===

    // Create maps to track new IDs for quarterly and weekly goals
    const quarterlyGoalIdMap = new Map<Id<'goals'>, Id<'goals'>>();
    const weeklyGoalIdMap = new Map<Id<'goals'>, Id<'goals'>>();

    // Calculate all week numbers in the target quarter
    const startDate = DateTime.local(to.year, (to.quarter - 1) * 3 + 1, 1);
    const endDate = startDate.plus({ months: 3 }).minus({ days: 1 });
    const startWeek = startDate.weekNumber;
    const endWeek = endDate.weekNumber;

    // 1. Copy quarterly goals
    for (const quarterlyGoal of incompleteQuarterlyGoals) {
      // Get the state info for starred/pinned status
      const states = quarterlyGoalStateMap.get(quarterlyGoal._id)?.states || [];
      const firstState = states.length > 0 ? states[0] : null;

      // Create the new quarterly goal
      const newQuarterlyGoalId = await ctx.db.insert('goals', {
        userId,
        year: to.year,
        quarter: to.quarter,
        title: quarterlyGoal.title,
        details: quarterlyGoal.details,
        inPath: '/',
        depth: 0, // Quarterly goals have depth 0
        // Add a reference to the original goal
        carryOver: {
          type: 'week', // Use 'week' as the type since that's what's expected
          numWeeks: 1, // Add the required numWeeks property
          fromGoal: {
            previousGoalId: quarterlyGoal._id,
            rootGoalId: quarterlyGoal._id,
          },
        },
      });

      // Store the mapping from old ID to new ID
      quarterlyGoalIdMap.set(quarterlyGoal._id, newQuarterlyGoalId);

      // Create goal states for all weeks in the new quarter
      for (let weekNum = startWeek; weekNum <= endWeek; weekNum++) {
        await ctx.db.insert('goalStateByWeek', {
          userId,
          year: to.year,
          quarter: to.quarter,
          goalId: newQuarterlyGoalId,
          weekNumber: weekNum,
          // Keep the original starred/pinned status on the first state
          isStarred:
            weekNum === startWeek ? firstState?.isStarred || false : false,
          isPinned:
            weekNum === startWeek ? firstState?.isPinned || false : false,
          isComplete: false,
        });
      }
    }

    // 2. Copy weekly goals
    for (const weeklyGoal of incompleteWeeklyGoals) {
      // Get the parent quarterly goal ID in the new quarter
      const originalParentId = weeklyGoal.parentId as Id<'goals'>;
      const newParentId = quarterlyGoalIdMap.get(originalParentId);

      if (!newParentId) {
        console.warn(
          `Parent quarterly goal not found for weekly goal: ${weeklyGoal._id}`
        );
        continue; // Skip this weekly goal if we can't find its parent
      }

      // Create the new weekly goal
      const newWeeklyGoalId = await ctx.db.insert('goals', {
        userId,
        year: to.year,
        quarter: to.quarter,
        title: weeklyGoal.title,
        details: weeklyGoal.details,
        inPath: `/${newParentId}`,
        parentId: newParentId,
        depth: 1, // Weekly goals have depth 1
        // Add a reference to the original goal
        carryOver: {
          type: 'week', // Use 'week' as the type since that's what's expected
          numWeeks: 1, // Add the required numWeeks property
          fromGoal: {
            previousGoalId: weeklyGoal._id,
            rootGoalId: weeklyGoal._id,
          },
        },
      });

      // Store the mapping from old ID to new ID
      weeklyGoalIdMap.set(weeklyGoal._id, newWeeklyGoalId);

      // Create a goal state for the current week
      await ctx.db.insert('goalStateByWeek', {
        userId,
        year: to.year,
        quarter: to.quarter,
        goalId: newWeeklyGoalId,
        weekNumber: startWeek, // Use the first week of the quarter
        isStarred: false,
        isPinned: false,
        isComplete: false,
      });
    }

    // 3. Copy daily goals
    for (const dailyGoal of incompleteDailyGoals) {
      // Get the parent weekly goal ID in the new quarter
      const originalParentId = dailyGoal.parentId as Id<'goals'>;
      const newWeeklyGoalId = weeklyGoalIdMap.get(originalParentId);

      if (!newWeeklyGoalId) {
        console.warn(
          `Parent weekly goal not found for daily goal: ${dailyGoal._id}`
        );
        continue; // Skip this daily goal if we can't find its parent
      }

      // Find the weekly goal to get its parent quarterly goal
      const weeklyGoal = incompleteWeeklyGoals.find(
        (wg) => wg._id === originalParentId
      );
      if (!weeklyGoal || !weeklyGoal.parentId) {
        console.warn(
          `Cannot determine quarterly parent for daily goal: ${dailyGoal._id}`
        );
        continue;
      }

      // Get the new quarterly goal ID
      const newQuarterlyGoalId = quarterlyGoalIdMap.get(
        weeklyGoal.parentId as Id<'goals'>
      );
      if (!newQuarterlyGoalId) {
        console.warn(
          `Quarterly parent not found for daily goal: ${dailyGoal._id}`
        );
        continue;
      }

      // Create the new daily goal with proper hierarchical inPath
      const newDailyGoalId = await ctx.db.insert('goals', {
        userId,
        year: to.year,
        quarter: to.quarter,
        title: dailyGoal.title,
        details: dailyGoal.details,
        inPath: `/${newQuarterlyGoalId}/${newWeeklyGoalId}`,
        parentId: newWeeklyGoalId,
        depth: 2, // Daily goals have depth 2
        // Add a reference to the original goal
        carryOver: {
          type: 'week', // Use 'week' as the type since that's what's expected
          numWeeks: 1, // Add the required numWeeks property
          fromGoal: {
            previousGoalId: dailyGoal._id,
            rootGoalId: dailyGoal._id,
          },
        },
      });

      // Find the daily state for this goal
      const dailyState = dailyGoalStates.find(
        (state) => state.goalId === dailyGoal._id
      );

      // Create a goal state for this daily goal
      await ctx.db.insert('goalStateByWeek', {
        userId,
        year: to.year,
        quarter: to.quarter,
        goalId: newDailyGoalId,
        weekNumber: startWeek, // Use the first week of the quarter
        isStarred: false,
        isPinned: false,
        isComplete: false,
        // Preserve the day of week if available
        daily: dailyState?.daily || { dayOfWeek: 1 }, // Default to Monday if not specified
      });
    }

    return {
      quarterlyGoalsToCopy,
      weeklyGoalsToCopy,
      dailyGoalsToCopy,
      quarterlyGoalsCopied: incompleteQuarterlyGoals.length,
      weeklyGoalsCopied: incompleteWeeklyGoals.length,
      dailyGoalsCopied: incompleteDailyGoals.length,
    };
  },
});
