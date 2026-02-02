import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import {
  Archive,
  ArrowUp,
  CalendarDays,
  Clock,
  Edit2,
  FileText,
  Maximize2,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useState } from 'react';

import { useGoalDisplayContext } from './GoalDisplayContext';
import { useGoalEditContext } from './GoalEditContext';
import { MoveGoalToWeekModal } from './MoveGoalToWeekModal';

import { PendingStatusDialog } from '@/components/atoms/PendingStatusDialog';
import { GoalDeletePreviewDialog } from '@/components/organisms/GoalDeletePreviewDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGoalContext } from '@/contexts/GoalContext';
import { usePendingGoalStatus } from '@/contexts/GoalStatusContext';
import { useMoveWeeklyGoal } from '@/hooks/useMoveWeeklyGoal';
import { useWeek } from '@/hooks/useWeek';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

/** Preview node for delete confirmation - matches GoalDeletePreviewDialog */
interface GoalPreviewNode {
  _id: Id<'goals'>;
  title: string;
  depth: number;
  children: GoalPreviewNode[];
  weeks?: number[];
}

/** Delete preview result from dry run */
interface DeletePreview {
  isDryRun: boolean;
  goalsToDelete: GoalPreviewNode[];
}

/**
 * Props for the GoalActionMenuNew component.
 */
export interface GoalActionMenuNewProps {
  /** Callback fired when goal is saved after editing */
  onSave: (
    title: string,
    details: string | undefined,
    dueDate: number | undefined
  ) => Promise<void>;
  /** Whether this is a quarterly goal (affects available actions) */
  isQuarterlyGoal?: boolean;
  /** Whether this is an adhoc goal (shows backlog toggle) */
  isAdhocGoal?: boolean;
  /** Current backlog status (only for adhoc goals) */
  isBacklog?: boolean;
  /** Handler for toggling backlog status (only for adhoc goals) */
  onToggleBacklog?: (isBacklog: boolean) => void;
  /** Additional CSS classes to apply to the trigger button */
  className?: string;
}

/**
 * New action menu component that uses the GoalDisplayContext for fullscreen mode.
 * This replaces the old GoalActionMenu and removes the need for a separate fullscreen modal.
 */
export const GoalActionMenuNew: React.FC<GoalActionMenuNewProps> = ({
  onSave: _onSave,
  isQuarterlyGoal = false,
  isAdhocGoal = false,
  isBacklog = false,
  onToggleBacklog,
  className,
}) => {
  const { goal } = useGoalContext();
  const { startEditing } = useGoalEditContext();
  const { requestFullScreen } = useGoalDisplayContext();
  const router = useRouter();
  const { year, quarter, weekNumber } = useWeek();
  const { sessionId } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  // Pending status
  const { isPending } = usePendingGoalStatus(goal._id);
  const [isPendingDialogOpen, setIsPendingDialogOpen] = useState(false);

  // Delete goal functionality
  const deleteGoalMutation = useMutation(api.goal.deleteGoal);
  const [isDeletePreviewOpen, setIsDeletePreviewOpen] = useState(false);
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Move to week functionality for weekly goals
  const {
    openMoveModal,
    closeMoveModal,
    moveGoalToWeek,
    modalState: moveModalState,
    destinationWeeks,
    defaultDestinationWeek,
    getMoveMode,
    isSubmitting,
  } = useMoveWeeklyGoal(year, quarter, weekNumber);

  const isWeeklyGoal = goal.depth === 1;

  /**
   * Handles edit action click, opening the edit modal and closing dropdown.
   */
  const handleEditClick = useCallback(() => {
    startEditing(goal);
    setIsOpen(false);
  }, [startEditing, goal]);

  /**
   * Handles summary view action for quarterly goals, navigating to summary page.
   */
  const handleSummaryClick = useCallback(() => {
    const summaryUrl = `/app/goal/${goal._id}/quarterly-summary?year=${year}&quarter=${quarter}`;
    router.push(summaryUrl);
    setIsOpen(false);
  }, [goal._id, year, quarter, router]);

  /**
   * Handles full screen view action, opening fullscreen mode via context.
   */
  const handleFullScreenClick = useCallback(() => {
    requestFullScreen();
    setIsOpen(false);
  }, [requestFullScreen]);

  /**
   * Handles move to week action for weekly goals, opening move modal.
   */
  const handleMoveToWeekClick = useCallback(() => {
    setIsOpen(false);
    openMoveModal(goal);
  }, [openMoveModal, goal]);

  /**
   * Handles move modal confirmation, executing the move operation.
   */
  const handleMoveConfirm = useCallback(
    async (destination: Parameters<typeof moveGoalToWeek>[1]) => {
      if (!moveModalState.goal) return;
      await moveGoalToWeek(moveModalState.goal, destination);
    },
    [moveGoalToWeek, moveModalState.goal]
  );

  /**
   * Handles pending action click, opening the pending dialog.
   */
  const handlePendingClick = useCallback(() => {
    setIsOpen(false);
    setIsPendingDialogOpen(true);
  }, []);

  /**
   * Handles delete action click, showing the delete preview.
   */
  const handleDeleteClick = useCallback(async () => {
    if (!sessionId) return;
    setIsOpen(false);

    try {
      setIsDeleting(true);
      const preview = (await deleteGoalMutation({
        sessionId,
        goalId: goal._id,
        dryRun: true,
      })) as DeletePreview;

      setDeletePreview(preview);
      setIsDeletePreviewOpen(true);
    } catch (error) {
      console.error('Error previewing goal deletion:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [sessionId, goal._id, deleteGoalMutation]);

  /**
   * Handles confirmed deletion after preview.
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (!sessionId) return;

    try {
      setIsDeleting(true);
      await deleteGoalMutation({
        sessionId,
        goalId: goal._id,
      });
      setIsDeletePreviewOpen(false);
      setDeletePreview(null);
    } catch (error) {
      console.error('Error deleting goal:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [sessionId, goal._id, deleteGoalMutation]);

  /**
   * Handles backlog toggle for adhoc goals.
   */
  const handleBacklogToggle = useCallback(() => {
    setIsOpen(false);
    onToggleBacklog?.(!isBacklog);
  }, [isBacklog, onToggleBacklog]);

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 px-2 text-xs text-muted-foreground hover:text-foreground',
              className
            )}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleFullScreenClick();
            }}
            className="flex items-center cursor-pointer"
          >
            <Maximize2 className="mr-2 h-4 w-4" />
            <span>View Full Details</span>
          </DropdownMenuItem>
          {isQuarterlyGoal && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleSummaryClick();
              }}
              className="flex items-center cursor-pointer"
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>View Summary</span>
            </DropdownMenuItem>
          )}
          {isWeeklyGoal && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleMoveToWeekClick();
              }}
              className="flex items-center cursor-pointer"
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              <span>Move to Week…</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleEditClick();
            }}
            className="flex items-center cursor-pointer"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Mark Pending */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handlePendingClick();
            }}
            className={cn(
              'flex items-center cursor-pointer',
              isPending && 'text-orange-600 dark:text-orange-400'
            )}
          >
            <Clock className="mr-2 h-4 w-4" />
            <span>{isPending ? 'Update Pending' : 'Mark Pending'}</span>
          </DropdownMenuItem>

          {/* Move to Backlog (only for adhoc goals) */}
          {isAdhocGoal && onToggleBacklog && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleBacklogToggle();
              }}
              className="flex items-center cursor-pointer"
            >
              {isBacklog ? (
                <>
                  <ArrowUp className="mr-2 h-4 w-4" />
                  <span>Move to Active</span>
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  <span>Move to Backlog</span>
                </>
              )}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Delete */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleDeleteClick();
            }}
            className="flex items-center cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MoveGoalToWeekModal
        goal={moveModalState.goal}
        isOpen={moveModalState.isOpen}
        onClose={closeMoveModal}
        destinationWeeks={destinationWeeks}
        defaultDestinationWeek={defaultDestinationWeek}
        onConfirm={handleMoveConfirm}
        moveMode={moveModalState.goal ? getMoveMode(moveModalState.goal) : 'move_all'}
        isSubmitting={isSubmitting}
      />

      {/* Pending Status Dialog (controlled mode) */}
      <PendingStatusDialog
        goalId={goal._id}
        open={isPendingDialogOpen}
        onOpenChange={setIsPendingDialogOpen}
      />

      {/* Delete Preview Dialog */}
      <GoalDeletePreviewDialog
        open={isDeletePreviewOpen}
        onOpenChange={setIsDeletePreviewOpen}
        preview={deletePreview}
        onDeleteGoals={handleDeleteConfirm}
      />
    </>
  );
};
