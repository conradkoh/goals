import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { FocusedGoalItem } from '@workspace/backend/convex/bff/focus';

export function filterFocusedGoalsByInitiative(
  goals: FocusedGoalItem[],
  initiativeId: Id<'initiatives'> | null
): FocusedGoalItem[] {
  if (!initiativeId) return goals;
  return goals.filter((goal) => goal.initiativeId === initiativeId);
}
