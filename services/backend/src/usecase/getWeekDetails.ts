import type { Doc, Id } from '../../convex/_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../convex/_generated/server';
import { joinPath } from '../util/path';

// A tree of quarterly goals with their weekly goals and daily goals
export type WeekGoalsTree = {
  quarterlyGoals: GoalWithDetailsAndChildren[];
  weekNumber: number;
  allGoals: GoalWithDetailsAndChildren[];
  stats?: {
    totalTasks: number;
    completedTasks: number;
  };
};

type Goal = Doc<'goals'>;
type GoalWithDetails = Goal & {
  grandParentTitle?: string;
  parentTitle?: string;
  state?: Doc<'goalStateByWeek'>;
};
export type GoalWithDetailsAndChildren = TWithChildren<GoalWithDetails>;
/**
 * Represents a type that includes a path and children for a given type T.
 */
export type TWithChildren<T> = T & {
  path: string;
  children: TWithChildren<T>[];
};

/** Daily goal with optional logs */
export type DailyGoalWithLogs = GoalWithDetailsAndChildren & {
  /** Goal logs for the daily goal (by root goal ID for full history) */
  logs?: Doc<'goalLogs'>[];
};

/** Weekly goal with logs and children (daily goals) that also have logs */
export type WeeklyGoalWithLogs = Omit<GoalWithDetailsAndChildren, 'children'> & {
  weekNumber: number;
  weekStartTimestamp: number;
  weekEndTimestamp: number;
  /** Goal logs for the weekly goal (by root goal ID for full history) */
  logs?: Doc<'goalLogs'>[];
  /** Daily goals with their logs */
  children: DailyGoalWithLogs[];
};

/** Adhoc goal with optional logs */
export type AdhocGoalWithLogs = Doc<'goals'> & {
  /** Goal logs for the adhoc goal (by root goal ID for full history) */
  logs?: Doc<'goalLogs'>[];
};

// Quarterly goal summary data structure
export type QuarterlyGoalSummary = {
  quarterlyGoal: {
    _id: Id<'goals'>;
    title: string;
    details?: string;
    isComplete: boolean;
    completedAt?: number;
    state?: Doc<'goalStateByWeek'>;
    /** Goal logs for the quarterly goal (by root goal ID for full history) */
    logs?: Doc<'goalLogs'>[];
  };
  weeklyGoalsByWeek: Record<number, WeeklyGoalWithLogs[]>;
  quarter: number;
  year: number;
  weekRange: {
    startWeek: number;
    endWeek: number;
  };
};

// Multiple quarterly goals summary data structure
export type MultipleQuarterlyGoalsSummary = {
  quarterlyGoals: QuarterlyGoalSummary[];
  /** Adhoc goals with their logs */
  adhocGoals?: AdhocGoalWithLogs[];
  year: number;
  quarter: number;
  weekRange: {
    startWeek: number;
    endWeek: number;
  };
};

// Quarterly goal option for selection UI
export type QuarterlyGoalOption = {
  _id: Id<'goals'>;
  title: string;
  isComplete: boolean;
  completedAt?: number;
  weeklyGoalCount: number;
  completedWeeklyGoalCount: number;
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
  const weekStates = await ctx.db
    .query('goalStateByWeek')
    .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
      q.eq('userId', userId).eq('year', year).eq('quarter', quarter).eq('weekNumber', weekNumber)
    )
    .collect();

  // Get the associated goal details
  const goalIds = weekStates.map((ws) => ws.goalId);
  const goals = (await Promise.all(goalIds.map((goalId) => ctx.db.get('goals', goalId)))).filter(
    (goal) => goal !== null
  );

  const weekStatesMap = new Map(weekStates.map((ws) => [ws.goalId, ws]));

  // Organize goals by depth, root goals (depth 0) are quarterly goals
  const { tree: quarterlyGoals, index } = buildGoalTree(goals, (n) => {
    // Get the weekly state for this goal
    const weekState = weekStatesMap.get(n._id);

    // Create a shallow copy of the node but keep isComplete field
    const nodeWithoutCompletionStatus = { ...n };
    // We can safely delete completedAt as it's optional
    delete nodeWithoutCompletionStatus.completedAt;

    if (weekState) {
      // We no longer need to add isComplete and completedAt to the state
      // as these fields have been moved to the goal table
      return {
        ...nodeWithoutCompletionStatus,
        state: weekState,
        // Keep isComplete and completedAt from the goal directly for compatibility
        isComplete: n.isComplete,
        completedAt: n.completedAt,
      };
    }

    // If no weekly state exists, we keep the state as undefined
    return {
      ...nodeWithoutCompletionStatus,
      state: undefined,
      // Keep isComplete and completedAt from the goal directly for compatibility
      isComplete: n.isComplete,
      completedAt: n.completedAt,
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
  const nodeIndex = n.reduce(
    (acc, n) => {
      const base: GoalWithDetailsAndChildren = {
        ...n,
        path: joinPath(n.inPath, n._id),
        state: undefined,
        children: [],
      };
      acc[n._id] = attach(base);
      return acc;
    },
    {} as Record<Id<'goals'>, GoalWithDetailsAndChildren>
  );

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
          throw new Error(`depth ${node.depth} goal has no parent. node id: ${node._id}`);
        }
        const parent = nodeIndex[node.parentId];
        if (!parent) {
          throw new Error(
            `depth ${node.depth} goal has deleted parent. node id: ${node._id} | parent id: ${node.parentId}`
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
