import { useGoalActions } from '@/hooks/useGoalActions';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { Trash2 } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { GoalDeletePreviewDialog } from '../organisms/goals-new/week-card-sections/GoalDeletePreviewDialog';

interface DeleteGoalIconButtonProps {
  requireConfirmation: boolean;
  goalId: Id<'goals'>;
}

export const DeleteGoalIconButton = ({
  requireConfirmation = true,
  goalId,
}: DeleteGoalIconButtonProps) => {
  const {
    previewGoalDeletion,
    confirmGoalDeletion,
    goalDeletionState: {
      isPreviewOpen,
      setIsPreviewOpen,
      deletePreview,
      isDeleting,
    },
  } = useGoalActions();

  const handleDeleteClick = useCallback(async () => {
    if (requireConfirmation) {
      await previewGoalDeletion(goalId);
    } else {
      await deleteGoal();
    }
  }, [goalId, previewGoalDeletion, requireConfirmation]);

  const deleteGoal = useCallback(async () => {
    await confirmGoalDeletion();
  }, [confirmGoalDeletion]);

  const DeleteButton = useMemo(
    () => (
      <button className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-red-600">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    ),
    []
  );

  return (
    <>
      <>
        <button
          onClick={handleDeleteClick}
          className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-red-600"
          disabled={isDeleting}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </>
      <GoalDeletePreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        preview={deletePreview}
        onDeleteGoals={deleteGoal}
      />
    </>
  );
};
