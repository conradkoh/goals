import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { Doc, Id } from './_generated/dataModel';
import { requireLogin } from '../src/usecase/requireLogin';
import { ConvexError } from 'convex/values';
// @deprecated
// type WeeklyState = {
//   quarterlyGoals: {
//     year: number;
//     quarter: number;
//     weekNumber: number;
//     progress: string;
//     isStarred: boolean;
//     isPinned: boolean;
//     isComplete: boolean;
//     inPath: string;
//     depth: number;
//   }[];
//   weeklyGoals: {
//     inPath: string;
//     depth: number;
//     isSoftComplete: boolean; //when all daily goals are complete
//     isComplete: boolean;
//   }[];
//   dailyGoals: {
//     inPath: string;
//     depth: number;
//     isComplete: boolean;
//   }[];
// };

// Get the overview of all weeks in a quarter
export const getQuarterOverview = query({
  args: {
    sessionId: v.id('sessions'),
    quarter: v.number(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const { sessionId, year, quarter } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Get all goals for the quarter
    const goals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) =>
        q.eq('userId', userId).eq('year', year).eq('quarter', quarter)
      )
      .collect();

    // Create a map of goals by ID for quick lookup
    const goalsMap = new Map(goals.map((goal) => [goal._id, goal]));

    // Get weekly summaries
    const weeklyGoals = await ctx.db
      .query('goalsWeekly')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q.eq('userId', userId).eq('year', year).eq('quarter', quarter)
      )
      .collect();

    // Organize by week number
    const weekSummaries = weeklyGoals.reduce((acc, weeklyGoal) => {
      const weekNumber = weeklyGoal.weekNumber;
      if (!acc[weekNumber]) {
        acc[weekNumber] = {
          weekNumber,
          goals: [],
        };
      }

      const goal = goalsMap.get(weeklyGoal.goalId);
      if (goal) {
        acc[weekNumber].goals.push({
          title: goal.title,
          depth: goal.depth,
          ...weeklyGoal,
        });
      }

      return acc;
    }, {} as Record<number, { weekNumber: number; goals: (Pick<Doc<'goals'>, 'title' | 'depth'> & Doc<'goalsWeekly'>)[] }>);

    return weekSummaries;
  },
});

// Get detailed data for a specific week
export const getWeekDetails = query({
  args: {
    userId: v.id('users'),
    sessionId: v.id('sessions'),
    year: v.number(),
    quarter: v.number(),
    weekNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, year, quarter, weekNumber } = args;

    // Get goals for this specific week
    const weeklyGoals = await ctx.db
      .query('goalsWeekly')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q
          .eq('userId', userId)
          .eq('year', year)
          .eq('quarter', quarter)
          .eq('weekNumber', weekNumber)
      )
      .collect();

    // Get the associated goal details
    const goalIds = weeklyGoals.map((wg) => wg.goalId);
    const goals = (
      await Promise.all(goalIds.map((goalId) => ctx.db.get(goalId)))
    ).filter((goal) => goal !== null);

    const weeklyGoalsMap = new Map(weeklyGoals.map((wg) => [wg.goalId, wg]));

    // Organize goals by depth

    const { tree } = buildGoalTree(goals, (n) => {
      // augment the tree with weekly goal data
      return {
        //add data from the weekly goals (timeseries)
        ...n,
        weeklyGoals: weeklyGoalsMap.get(n._id),
      };
    });
    return tree;
  },
});
/**
 * Represents a type that includes a path and children for a given type T.
 */
type TWithChildren<T> = T & { path: string; children: T[] };

/**
 * Builds a tree structure from an array of goals, attaching additional data to each node.
 *
 * @template T - The type of the goal, which must include an _id, optional parentId, inPath, and depth.
 * @template V - The type of the goal with children, extending TWithChildren<T>.
 * @param n - An array of goals to be organized into a tree structure.
 * @param attach - A function that takes a goal with children and returns a modified version of that goal.
 * @returns An object containing the tree structure and an index of the nodes by goalId.
 */
function buildGoalTree<
  T extends {
    _id: Id<'goals'>;
    parentId?: Id<'goals'>;
    inPath: string;
    depth: number;
  },
  V extends TWithChildren<T>
>(n: T[], attach: (n: TWithChildren<T>) => V) {
  const roots: TWithChildren<V>[] = [];

  //index the nodes by goalId
  const nodeIndex = n.reduce((acc, n) => {
    const base: TWithChildren<T> = {
      ...n,
      path: `${n.inPath}/${n._id}`,
      children: [],
    };
    acc[n._id] = attach(base);
    return acc;
  }, {} as Record<Id<'goals'>, V>);

  for (const key in nodeIndex) {
    const node = nodeIndex[key as Id<'goals'>];
    switch (node.depth) {
      case 0: {
        roots.push({ ...node, children: [] });
        break;
      }
      case 1:
      case 2: {
        if (!node.parentId) {
          throw new Error(
            `depth ${node.depth} goal has no parent. node id: ${node._id}`
          );
        }
        const parent = nodeIndex[node.parentId];

        if (parent) {
          parent.children.push(node);
        }
        break;
      }
    }
  }

  return {
    tree: roots,
    index: nodeIndex,
  };
}

export const createQuarterlyGoal = mutation({
  args: {
    sessionId: v.id('sessions'),
    year: v.number(),
    quarter: v.number(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { sessionId, year, quarter, title } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Create the quarterly goal
    const goalId = await ctx.db.insert('goals', {
      userId,
      year,
      quarter,
      title,
      inPath: `/quarters/${quarter}`,
      depth: 0, // 0 for quarterly goals
    });

    // Create initial weekly states for this goal (for all weeks in the quarter)
    // A quarter typically has 13 weeks
    for (let weekNumber = 1; weekNumber <= 13; weekNumber++) {
      await ctx.db.insert('goalsWeekly', {
        userId,
        year,
        quarter,
        goalId,
        weekNumber,
        progress: '0',
        isStarred: false,
        isPinned: false,
        isComplete: false,
      });
    }

    return goalId;
  },
});

export const updateQuarterlyGoalStatus = mutation({
  args: {
    sessionId: v.id('sessions'),
    year: v.number(),
    quarter: v.number(),
    weekNumber: v.number(),
    goalId: v.id('goals'),
    isStarred: v.boolean(),
    isPinned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const {
      sessionId,
      year,
      quarter,
      weekNumber,
      goalId,
      isStarred,
      isPinned,
    } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the weekly goal record
    const weeklyGoal = await ctx.db
      .query('goalsWeekly')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q
          .eq('userId', userId)
          .eq('year', year)
          .eq('quarter', quarter)
          .eq('weekNumber', weekNumber)
      )
      .filter((q) => q.eq(q.field('goalId'), goalId))
      .first();

    if (!weeklyGoal) {
      throw new Error('Weekly goal not found');
    }

    // Update the status
    await ctx.db.patch(weeklyGoal._id, {
      isStarred,
      isPinned,
    });

    return weeklyGoal._id;
  },
});

export const updateQuarterlyGoalTitle = mutation({
  args: {
    sessionId: v.id('sessions'),
    goalId: v.id('goals'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId, title } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the goal and verify ownership
    const goal = await ctx.db.get(goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }
    if (goal.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Update the goal title
    await ctx.db.patch(goalId, {
      title,
    });

    return goalId;
  },
});

export const deleteQuarterlyGoal = mutation({
  args: {
    sessionId: v.id('sessions'),
    goalId: v.id('goals'),
  },
  handler: async (ctx, args) => {
    const { sessionId, goalId } = args;
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

    // Check for child goals
    const childGoals = await ctx.db
      .query('goals')
      .withIndex('by_user_and_year_and_quarter', (q) =>
        q.eq('userId', userId).eq('year', goal.year).eq('quarter', goal.quarter)
      )
      .filter((q) => q.eq(q.field('parentId'), goalId))
      .collect();

    if (childGoals.length > 0) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message:
          'Cannot delete goal with child goals. Please delete all child goals first.',
        details: {
          childCount: childGoals.length,
        },
      });
    }

    // Delete all weekly goals associated with this goal
    const weeklyGoals = await ctx.db
      .query('goalsWeekly')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q.eq('userId', userId).eq('year', goal.year).eq('quarter', goal.quarter)
      )
      .filter((q) => q.eq(q.field('goalId'), goalId))
      .collect();

    for (const weeklyGoal of weeklyGoals) {
      await ctx.db.delete(weeklyGoal._id);
    }

    // Delete the goal itself
    await ctx.db.delete(goalId);

    return goalId;
  },
});
