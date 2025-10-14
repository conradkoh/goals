import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { CalendarDays, Edit2, FileText, Maximize2, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMoveWeeklyGoal } from '@/hooks/useMoveWeeklyGoal';
import { useWeek } from '@/hooks/useWeek';
import { cn } from '@/lib/utils';
import { GoalDetailsFullScreenModal } from './GoalDetailsFullScreenModal';
import { useGoalEditContext } from './GoalEditContext';
import { MoveGoalToWeekModal } from './MoveGoalToWeekModal';
/**
 * Props for the GoalActionMenu component providing action options for goals.
 *
 * @example
 * ```typescript
 * <GoalActionMenu
 *   goal={weeklyGoal}
 *   onSave={handleSave}
 *   isQuarterlyGoal={false}
 *   className="ml-2"
 * />
 * ```
 */
export interface GoalActionMenuProps {
  /** The goal for which actions are available */
  goal: GoalWithDetailsAndChildren;
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

interface _DropdownState {
  isOpen: boolean;
}

interface _ModalState {
  isFullScreenOpen: boolean;
}
/**
 * Action menu component providing contextual actions for goals.
 * Displays a dropdown with options like edit, move, view details, and summary.
 * Actions vary based on goal type (quarterly vs weekly) and depth.
 */
export const GoalActionMenu: React.FC<GoalActionMenuProps> = ({
  goal,
  onSave,
  isQuarterlyGoal = false,
  className,
}) => {
  const { startEditing } = useGoalEditContext();
  const router = useRouter();
  const { year, quarter, weekNumber } = useWeek();
  const [dropdownState, setDropdownState] = useState<_DropdownState>({ isOpen: false });
  const [modalState, setModalState] = useState<_ModalState>({ isFullScreenOpen: false });

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
    setDropdownState({ isOpen: false });
  }, [startEditing, goal]);

  /**
   * Handles summary view action for quarterly goals, navigating to summary page.
   */
  const handleSummaryClick = useCallback(() => {
    const summaryUrl = `/app/goal/${goal._id}/quarterly-summary?year=${year}&quarter=${quarter}`;
    router.push(summaryUrl);
    setDropdownState({ isOpen: false });
  }, [goal._id, year, quarter, router]);

  /**
   * Handles full screen modal open action, closing dropdown.
   */
  const handleFullScreenClick = useCallback(() => {
    setModalState({ isFullScreenOpen: true });
    setDropdownState({ isOpen: false });
  }, []);

  /**
   * Handles move to week action for weekly goals, opening move modal.
   */
  const handleMoveToWeekClick = useCallback(() => {
    setDropdownState({ isOpen: false });
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
   * Handles full screen modal close action.
   */
  const handleFullScreenClose = useCallback(() => {
    setModalState({ isFullScreenOpen: false });
  }, []);

  return (
    <>
      <DropdownMenu
        open={dropdownState.isOpen}
        onOpenChange={(isOpen) => setDropdownState({ isOpen })}
      >
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

      <GoalDetailsFullScreenModal
        goal={goal}
        onSave={onSave}
        isOpen={modalState.isFullScreenOpen}
        onClose={handleFullScreenClose}
      />

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
