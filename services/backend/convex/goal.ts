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
