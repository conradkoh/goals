import { Doc, Id } from '../../convex/_generated/dataModel';
import { MutationCtx, QueryCtx } from '../../convex/_generated/server';
import { joinPath } from '../util/path';

// A tree of quarterly goals with their weekly goals and daily goals
export type WeekGoalsTree = {
  quarterlyGoals: GoalWithDetailsAndChildren[];
  weekNumber: number;
  allGoals: GoalWithDetailsAndChildren[];
};

type Goal = Doc<'goals'>;
type GoalWithDetails = Goal & {
  grandParentTitle?: string;
  parentTitle?: string;
  state?: Doc<'goalsWeekly'>;
};
export type GoalWithDetailsAndChildren = TWithChildren<GoalWithDetails>;
/**
 * Represents a type that includes a path and children for a given type T.
 */
export type TWithChildren<T> = T & {
  path: string;
  children: TWithChildren<T>[];
};

/**
 * Retrieves the details of the specified week, including associated goals.
 *
 * @param ctx - The context for the mutation or query, providing access to the database.
 * @param args - The arguments for the function.
 * @param args.userId - The ID of the user for whom the week details are being retrieved.
 * @param args.year - The year of the week to retrieve.
 * @param args.quarter - The quarter of the year for the week to retrieve.
 * @param args.weekNumber - The week number within the quarter to retrieve details for.
 * @returns A promise that resolves to an array of week details, each containing goal information.
 */

export const getWeekGoalsTree = async (
  ctx: MutationCtx | QueryCtx,
  args: {
    userId: Id<'users'>;
    year: number;
    quarter: number;
    weekNumber: number;
  }
): Promise<WeekGoalsTree> => {
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

  // Organize goals by depth, root goals (depth 0) are quarterly goals
  const { tree: quarterlyGoals, index } = buildGoalTree(goals, (n) => {
    // augment the tree with weekly goal data
    return {
      //add data from the weekly goals (timeseries)
      ...n,
      state: weeklyGoalsMap.get(n._id),
    };
  });

  return {
    quarterlyGoals,
    weekNumber,
    allGoals: Object.values(index),
  };
};

/**
 * Builds a tree structure from an array of goals, attaching additional data to each node.
 *
 * @template T - The type of the goal, which must include an _id, optional parentId, inPath, and depth.
 * @template V - The type of the goal with children, extending TWithChildren<T>.
 * @param n - An array of goals to be organized into a tree structure.
 * @param attach - A function that takes a goal with children and returns a modified version of that goal.
 * @returns An object containing the tree structure and an index of the nodes by goalId.
 */
export function buildGoalTree(
  n: Goal[],
  attach: (n: GoalWithDetailsAndChildren) => GoalWithDetailsAndChildren
) {
  const roots: GoalWithDetailsAndChildren[] = [];

  // First, index all nodes
  const nodeIndex = n.reduce((acc, n) => {
    const base: GoalWithDetailsAndChildren = {
      ...n,
      path: joinPath(n.inPath, n._id),
      state: undefined,
      children: [],
    };
    acc[n._id] = attach(base);
    return acc;
  }, {} as Record<Id<'goals'>, GoalWithDetailsAndChildren>);

  // Then, populate parent and grandparent titles
  for (const key in nodeIndex) {
    const node = nodeIndex[key as Id<'goals'>];
    if (node.parentId) {
      const parent = nodeIndex[node.parentId];
      if (parent) {
        node.parentTitle = parent.title;
        if (parent.parentId) {
          const grandParent = nodeIndex[parent.parentId];
          if (grandParent) {
            node.grandParentTitle = grandParent.title;
          }
        }
      }
    }
  }

  // Finally, build the tree structure
  for (const key in nodeIndex) {
    const node = nodeIndex[key as Id<'goals'>];
    switch (node.depth) {
      case 0: {
        roots.push(node);
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
        if (!parent) {
          throw new Error(
            `depth ${node.depth} goal has no parent. node id: ${node._id}`
          );
        }
        parent.children.push(node);
        break;
      }
    }
  }

  return {
    tree: roots,
    index: nodeIndex,
  };
}
