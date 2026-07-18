import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useCallback } from 'react';

import { buildAdhocDetailsOnlyArgs, buildStructuredDetailsOnlyArgs } from '@/domain/goal-updates';
import type { GoalSaveHandler } from '@/models/goal-handlers';

type StructuredGoalSnapshot = { title: string; dueDate?: number };
type AdhocGoalSnapshot = { title: string; adhoc?: { dueDate?: number } };

type AdhocGoalUpdater = (
  goalId: Id<'goals'>,
  args: ReturnType<typeof buildAdhocDetailsOnlyArgs>
) => Promise<unknown> | void;

/** Details-only auto-save for structured goals (quarterly/weekly/daily). */
export function useStructuredGoalDetailsSave(
  onSave: GoalSaveHandler,
  goal: StructuredGoalSnapshot
): (newDetails: string) => void {
  return useCallback(
    (newDetails: string) => {
      const fields = buildStructuredDetailsOnlyArgs(goal, newDetails);
      void onSave(fields.title, fields.details, fields.dueDate);
    },
    [onSave, goal]
  );
}

/** Details-only auto-save for adhoc goals via updateAdhocGoal mutation. */
export function useAdhocGoalDetailsSave(
  goalId: Id<'goals'>,
  updateAdhocGoal: AdhocGoalUpdater
): (newDetails: string) => void {
  return useCallback(
    (newDetails: string) => {
      void updateAdhocGoal(goalId, buildAdhocDetailsOnlyArgs(newDetails));
    },
    [goalId, updateAdhocGoal]
  );
}

/** Details-only auto-save for adhoc goals routed through GoalSaveHandler (list-item popover path). */
export function useAdhocGoalDetailsSaveViaHandler(
  onSave: GoalSaveHandler,
  goal: AdhocGoalSnapshot
): (newDetails: string) => void {
  return useCallback(
    (newDetails: string) => {
      void onSave(goal.title, newDetails, goal.adhoc?.dueDate);
    },
    [onSave, goal.title, goal.adhoc?.dueDate]
  );
}

type GoalTitleSaveSnapshot = {
  details?: string;
  dueDate?: number;
  domainId?: Id<'domains'> | null;
  initiativeId?: Id<'initiatives'> | null;
  adhoc?: { dueDate?: number };
};

/** Title-only save via GoalSaveHandler — preserves details/dueDate/domain/initiative. */
export function useGoalTitleSave(
  onSave: GoalSaveHandler,
  goal: GoalTitleSaveSnapshot
): (title: string) => void {
  return useCallback(
    (title: string) => {
      const dueDate = goal.adhoc?.dueDate ?? goal.dueDate;
      void onSave(title, goal.details, dueDate, goal.domainId, goal.initiativeId);
    },
    [onSave, goal.details, goal.dueDate, goal.adhoc?.dueDate, goal.domainId, goal.initiativeId]
  );
}
