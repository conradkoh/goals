import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useCallback } from 'react';
import { useGoalActions } from './useGoalActions';

export interface SummaryGoalActions {
  handleToggleComplete: (goal: GoalWithDetailsAndChildren, weekNumber: number) => Promise<void>;
  handleEditGoal: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
  handleDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  isLoading: boolean;
}

interface UseSummaryGoalActionsProps {
  onDataRefresh?: () => void;
}

export function useSummaryGoalActions({
  onDataRefresh,
}: UseSummaryGoalActionsProps = {}): SummaryGoalActions {
  const { toggleGoalCompletion, updateQuarterlyGoalTitle, deleteGoal } = useGoalActions();

  const handleToggleComplete = useCallback(
    async (goal: GoalWithDetailsAndChildren, weekNumber: number) => {
      try {
        const newCompletionStatus = !goal.isComplete;

        await toggleGoalCompletion({
          goalId: goal._id,
          weekNumber,
          isComplete: newCompletionStatus,
          updateChildren: true, // Update child goals as well
        });

        // Refresh data
        onDataRefresh?.();
      } catch (error) {
        console.error('Failed to toggle goal completion:', error);
      }
    },
    [toggleGoalCompletion, onDataRefresh]
  );

  const handleEditGoal = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string, dueDate?: number) => {
      try {
        // For now, we'll use the quarterly goal update function for all goals
        // This might need to be expanded based on goal type
        await updateQuarterlyGoalTitle({
          goalId,
          title,
          details,
          dueDate,
        });

        // Refresh data
        onDataRefresh?.();
      } catch (error) {
        console.error('Failed to edit goal:', error);
      }
    },
    [updateQuarterlyGoalTitle, onDataRefresh]
  );

  const handleDeleteGoal = useCallback(
    async (goalId: Id<'goals'>) => {
      try {
        await deleteGoal({ goalId });

        // Refresh data
        onDataRefresh?.();
      } catch (error) {
        console.error('Failed to delete goal:', error);
        // Error handling is already done in useGoalActions
      }
    },
    [deleteGoal, onDataRefresh]
  );

  return {
    handleToggleComplete,
    handleEditGoal,
    handleDeleteGoal,
    isLoading: false, // We can add loading state tracking later if needed
  };
}
