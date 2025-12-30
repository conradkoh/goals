import type { Doc, Id } from '../../../../convex/_generated/dataModel';
import type { MutationCtx } from '../../../../convex/_generated/server';

/**
 * Goal depth constants for clarity.
 */
export const GoalDepth = {
  QUARTERLY: 0,
  WEEKLY: 1,
  DAILY: 2,
} as const;

export type GoalDepthValue = (typeof GoalDepth)[keyof typeof GoalDepth];

/**
 * Parameters for creating a goal with carry-over metadata.
 */
export interface CreateGoalWithCarryOverParams {
  ctx: MutationCtx;
  userId: Id<'users'>;
  sourceGoal: Doc<'goals'>;
  target: {
    year: number;
    quarter: number;
  };
  parentId?: Id<'goals'>;
  depth: GoalDepthValue;
  inPath: string;
}

/**
 * Creates a new goal with proper carry-over metadata.
 * Preserves the rootGoalId chain for tracking goal lineage.
 *
 * The carry-over chain allows tracking the history of a goal:
 * - `previousGoalId`: The immediate source goal this was copied from
 * - `rootGoalId`: The original goal at the start of the carry-over chain
 * - `numWeeks`: How many times this goal has been carried over
 *
 * @param params - The parameters for creating the goal
 * @returns The ID of the newly created goal
 */
export async function createGoalWithCarryOver(
  params: CreateGoalWithCarryOverParams
): Promise<Id<'goals'>> {
  const { ctx, userId, sourceGoal, target, parentId, depth, inPath } = params;

  // Preserve the original rootGoalId from carry-over chains,
  // or use the source goal's own ID if it's the original
  const rootGoalId: Id<'goals'> = sourceGoal.carryOver?.fromGoal?.rootGoalId ?? sourceGoal._id;

  const goalData: {
    userId: Id<'users'>;
    year: number;
    quarter: number;
    title: string;
    details?: string;
    inPath: string;
    parentId?: Id<'goals'>;
    depth: number;
    isComplete: boolean;
    carryOver: {
      type: 'week';
      numWeeks: number;
      fromGoal: {
        previousGoalId: Id<'goals'>;
        rootGoalId: Id<'goals'>;
      };
    };
  } = {
    userId,
    year: target.year,
    quarter: target.quarter,
    title: sourceGoal.title,
    inPath,
    depth,
    isComplete: false,
    carryOver: {
      type: 'week',
      numWeeks: (sourceGoal.carryOver?.numWeeks ?? 0) + 1,
      fromGoal: {
        previousGoalId: sourceGoal._id,
        rootGoalId,
      },
    },
  };

  // Only add optional fields if they exist
  if (sourceGoal.details) {
    goalData.details = sourceGoal.details;
  }

  if (parentId) {
    goalData.parentId = parentId;
  }

  return await ctx.db.insert('goals', goalData);
}
