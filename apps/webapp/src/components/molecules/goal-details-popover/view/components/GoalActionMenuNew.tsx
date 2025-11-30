import { CalendarDays, Edit2, FileText, Maximize2, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useState } from 'react';
import { useGoalEditContext } from '@/components/molecules/goal-details/GoalEditContext';
import { MoveGoalToWeekModal } from '@/components/molecules/goal-details/MoveGoalToWeekModal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGoalContext } from '@/contexts/GoalContext';
import { useMoveWeeklyGoal } from '@/hooks/useMoveWeeklyGoal';
import { useWeek } from '@/hooks/useWeek';
import { cn } from '@/lib/utils';
import { useGoalDisplayContext } from './GoalDisplayContext';

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
  className,
}) => {
  const { goal } = useGoalContext();
  const { startEditing } = useGoalEditContext();
  const { requestFullScreen } = useGoalDisplayContext();
  const router = useRouter();
  const { year, quarter, weekNumber } = useWeek();
  const [isOpen, setIsOpen] = useState(false);

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
    </>
  );
};
