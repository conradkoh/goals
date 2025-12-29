import type { Doc, Id } from '../../../../convex/_generated/dataModel';

/**
 * Deduplicates goals by their rootGoalId.
 * When a goal has been carried over multiple times, only keep one instance.
 *
 * This is useful when processing goals from a quarter where the same conceptual
 * goal may exist multiple times due to weekly carry-overs.
 *
 * @param goals - Array of goals to deduplicate
 * @returns Deduplicated array, keeping the first occurrence of each root goal
 */
export function deduplicateByRootGoalId<T extends Doc<'goals'>>(goals: T[]): T[] {
  const seenRootGoalIds = new Set<string>();

  return goals.filter((goal) => {
    // Get the root goal ID - either from carry-over chain or the goal's own ID
    const rootGoalId: Id<'goals'> = goal.carryOver?.fromGoal?.rootGoalId ?? goal._id;
    const rootIdStr = rootGoalId.toString();

    if (seenRootGoalIds.has(rootIdStr)) {
      return false;
    }

    seenRootGoalIds.add(rootIdStr);
    return true;
  });
}
