import type { Doc, Id } from '../../convex/_generated/dataModel';

/**
 * Gets the root goal ID for a given goal.
 * If the goal was carried over, returns the rootGoalId from the carry-over chain.
 * Otherwise, returns the goal's own ID.
 *
 * @param goal - The goal document
 * @returns The root goal ID
 */
export function getRootGoalId(goal: Doc<'goals'>): Id<'goals'> {
  return goal.carryOver?.fromGoal?.rootGoalId ?? goal._id;
}
