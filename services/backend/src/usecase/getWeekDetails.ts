import { Id } from '../../convex/_generated/dataModel';
import { MutationCtx, QueryCtx } from '../../convex/_generated/server';

export const getWeekDetails = async (
  ctx: MutationCtx | QueryCtx,
  args: {
    userId: Id<'users'>;
    year: number;
    quarter: number;
    weekNumber: number;
  }
) => {
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
  const { tree: quarterlyGoals } = buildGoalTree(goals, (n) => {
    // augment the tree with weekly goal data
    return {
      //add data from the weekly goals (timeseries)
      ...n,
      weeklyGoals: weeklyGoalsMap.get(n._id),
    };
  });
  return quarterlyGoals;
};

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
