import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useGoalActions } from './useGoalActions';

export interface SummaryGoalActions {
  handleToggleComplete: (goal: GoalWithDetailsAndChildren, weekNumber: number) => Promise<void>;
  handleEditGoal: (goalId: Id<'goals'>, title: string, details?: string) => Promise<void>;
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

        // Show success feedback
        toast({
          title: newCompletionStatus ? 'Goal completed!' : 'Goal reopened',
          description: `"${goal.title}" has been ${newCompletionStatus ? 'completed' : 'reopened'}.`,
        });

        // Refresh data
        onDataRefresh?.();
      } catch (error) {
        console.error('Failed to toggle goal completion:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to update goal',
          description: 'There was an error updating the goal completion status.',
        });
      }
    },
    [toggleGoalCompletion, onDataRefresh]
  );

  const handleEditGoal = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string) => {
      try {
        // For now, we'll use the quarterly goal update function for all goals
        // This might need to be expanded based on goal type
        await updateQuarterlyGoalTitle({
          goalId,
          title,
          details,
        });

        toast({
          title: 'Goal updated!',
          description: 'The goal has been successfully updated.',
        });

        // Refresh data
        onDataRefresh?.();
      } catch (error) {
        console.error('Failed to edit goal:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to update goal',
          description: 'There was an error updating the goal.',
        });
      }
    },
    [updateQuarterlyGoalTitle, onDataRefresh]
  );

  const handleDeleteGoal = useCallback(
    async (goalId: Id<'goals'>) => {
      try {
        await deleteGoal({ goalId });

        toast({
          title: 'Goal deleted!',
          description: 'The goal has been successfully deleted.',
        });

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
