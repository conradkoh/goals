import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MoveMode, WeekOption } from '@/hooks/useMoveWeeklyGoal';
/**
 * Props for the MoveGoalToWeekModal component handling weekly goal movement.
 *
 * @example
 * ```typescript
 * <MoveGoalToWeekModal
 *   goal={weeklyGoal}
 *   isOpen={true}
 *   onClose={() => setModalOpen(false)}
 *   destinationWeeks={availableWeeks}
 *   defaultDestinationWeek={nextWeek}
 *   onConfirm={handleMove}
 *   moveMode="move_all"
 *   isSubmitting={false}
 * />
 * ```
 */
export interface MoveGoalToWeekModalProps {
  /** The goal being moved (optional for initial render) */
  goal?: GoalWithDetailsAndChildren;
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback fired when modal should be closed */
  onClose: () => void;
  /** Available destination weeks for selection */
  destinationWeeks: WeekOption[];
  /** Default week to pre-select in the dropdown */
  defaultDestinationWeek: WeekOption | null;
  /** Callback fired when user confirms the move operation */
  onConfirm: (destination: WeekOption) => Promise<void>;
  /** The move mode determining how child goals are handled */
  moveMode: MoveMode;
  /** Whether the move operation is currently in progress */
  isSubmitting: boolean;
}

interface _ModeDescription {
  title: string;
  description: string;
}

interface _ModalState {
  selectedWeek: WeekOption | null;
}
/**
 * Modal component for moving weekly goals to different weeks within the same quarter.
 * Provides week selection dropdown and explains the move behavior based on child goal completion status.
 * Shows loading state during move operations and handles form validation.
 */
export const MoveGoalToWeekModal = ({
  goal,
  isOpen,
  onClose,
  destinationWeeks,
  defaultDestinationWeek,
  onConfirm,
  moveMode,
  isSubmitting,
}: MoveGoalToWeekModalProps) => {
  const [modalState, setModalState] = useState<_ModalState>({
    selectedWeek: defaultDestinationWeek,
  });

  /**
   * Descriptions for different move modes explaining the behavior to users.
   */
  const _modeDescriptions: Record<MoveMode, _ModeDescription> = {
    move_all: {
      title: 'Move weekly goal and all children',
      description: 'The weekly goal and all of its child goals will be moved to the selected week.',
    },
    copy_children: {
      title: 'Copy weekly goal to selected week',
      description:
        'Completed child goals stay in the current week. Incomplete children move to the selected week.',
    },
  };

  const modeInfo = _modeDescriptions[moveMode];

  /**
   * Updates selected week when default destination week changes.
   */
  useEffect(() => {
    setModalState({ selectedWeek: defaultDestinationWeek });
  }, [defaultDestinationWeek]);

  /**
   * Memoized week options for the select dropdown.
   */
  const weekOptions = useMemo(() => destinationWeeks, [destinationWeeks]);

  /**
   * Handles week selection change from the dropdown.
   */
  const handleWeekChange = useCallback(
    (value: string) => {
      const match = weekOptions.find((week) => `${week.year}-${week.weekNumber}` === value);
      setModalState({ selectedWeek: match ?? null });
    },
    [weekOptions]
  );

  /**
   * Handles move confirmation, executing the move operation.
   */
  const handleMoveConfirm = useCallback(async () => {
    if (!modalState.selectedWeek) return;
    await onConfirm(modalState.selectedWeek);
  }, [modalState.selectedWeek, onConfirm]);

  /**
   * Handles dialog open/close state changes.
   */
  const handleDialogChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move goal to week</DialogTitle>
          <DialogDescription>
            Select the week you want to move this goal{goal ? ` (${goal.title})` : ''} to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="move-goal-week-select">Destination week</Label>
            <Select
              value={
                modalState.selectedWeek
                  ? `${modalState.selectedWeek.year}-${modalState.selectedWeek.weekNumber}`
                  : undefined
              }
              onValueChange={handleWeekChange}
            >
              <SelectTrigger id="move-goal-week-select">
                <SelectValue placeholder="Select a week" />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((week) => (
                  <SelectItem
                    key={`${week.year}-${week.weekNumber}`}
                    value={`${week.year}-${week.weekNumber}`}
                  >
                    {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 rounded-md border border-amber-400/60 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="font-medium">{modeInfo.title}</p>
              <p>{modeInfo.description}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleMoveConfirm} disabled={!modalState.selectedWeek || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Move
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
