import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useWeek } from '@/hooks/useWeek';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';
import { GoalDeletePreviewDialog } from './GoalDeletePreviewDialog';

interface GoalPreviewNode {
  _id: Id<'goals'>;
  title: string;
  depth: number;
  children: GoalPreviewNode[];
}

interface DeletePreview {
  isDryRun: boolean;
  goalsToDelete: GoalPreviewNode[];
}

interface DeleteGoalIconButtonProps {
  requireConfirmation: boolean;
  goalId: Id<'goals'>;
  /** Additional class names for the button visibility (e.g., for touch devices) */
  buttonClassName?: string;
}

export const DeleteGoalIconButton = ({
  requireConfirmation = true,
  goalId,
  buttonClassName,
}: DeleteGoalIconButtonProps) => {
  const { sessionId } = useSession();
  const deleteGoalMutation = useMutation(api.goal.deleteGoal);
  const { deleteGoalOptimistic } = useWeek();

  // Goal deletion preview state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = useCallback(async () => {
    if (requireConfirmation) {
      if (!sessionId) return;

      try {
        setIsDeleting(true);
        const preview = (await deleteGoalMutation({
          sessionId,
          goalId,
          dryRun: true,
        })) as DeletePreview;

        setDeletePreview(preview);
        setIsPreviewOpen(true);
      } catch (error) {
        console.error('Error previewing goal deletion:', error);
      } finally {
        setIsDeleting(false);
      }
    } else {
      deleteGoalOptimistic(goalId);
    }
  }, [goalId, requireConfirmation, sessionId, deleteGoalMutation, deleteGoalOptimistic]);

  const deleteGoal = useCallback(async () => {
    if (!sessionId) return;

    try {
      setIsDeleting(true);
      await deleteGoalMutation({
        sessionId,
        goalId,
      });

      // Close the preview dialog after successful deletion
      setIsPreviewOpen(false);
      setDeletePreview(null);
    } catch (error) {
      console.error('Error deleting goal:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [sessionId, goalId, deleteGoalMutation]);

  // Default visibility: hidden on desktop (show on hover), configurable via buttonClassName
  const defaultVisibility = 'opacity-0 group-hover/title:opacity-100';

  return (
    <>
      <button
        type="button"
        onClick={handleDeleteClick}
        className={cn(
          'text-muted-foreground transition-opacity hover:text-red-600',
          buttonClassName ?? defaultVisibility
        )}
        disabled={isDeleting}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <GoalDeletePreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        preview={deletePreview}
        onDeleteGoals={deleteGoal}
      />
    </>
  );
};
