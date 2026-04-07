import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { MoveMode, WeekOption } from '@/hooks/useMoveWeeklyGoal';
import { getISOWeekInfo } from '@/lib/date/iso-week';
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
  /** Current week number for context */
  currentWeekNumber?: number;
}

interface _ModeDescription {
  title: string;
  description: string;
}

interface _ModalState {
  selectedWeek: WeekOption | null;
  selectedDate: Date | undefined;
}

/**
 * Get the Monday of a given ISO week.
 */
function getDateForWeek(year: number, weekNumber: number): Date {
  return DateTime.fromObject({ weekYear: year, weekNumber, weekday: 1 }).toJSDate();
}

/**
 * Modal component for moving weekly goals to different weeks within the same quarter.
 * Provides calendar-based week selection and explains the move behavior based on child goal completion status.
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
  currentWeekNumber,
}: MoveGoalToWeekModalProps) => {
  const [modalState, setModalState] = useState<_ModalState>({
    selectedWeek: defaultDestinationWeek,
    selectedDate: defaultDestinationWeek
      ? getDateForWeek(defaultDestinationWeek.year, defaultDestinationWeek.weekNumber)
      : undefined,
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
   * Memoized set of valid week keys for quick lookup.
   */
  const validWeekKeys = useMemo(
    () => new Set(destinationWeeks.map((w) => `${w.year}-${w.weekNumber}`)),
    [destinationWeeks]
  );

  /**
   * Memoized map from week key to WeekOption.
   */
  const weekOptionMap = useMemo(
    () => new Map(destinationWeeks.map((w) => [`${w.year}-${w.weekNumber}`, w])),
    [destinationWeeks]
  );

  /**
   * Updates selected week when default destination week changes.
   */
  useEffect(() => {
    setModalState({
      selectedWeek: defaultDestinationWeek,
      selectedDate: defaultDestinationWeek
        ? getDateForWeek(defaultDestinationWeek.year, defaultDestinationWeek.weekNumber)
        : undefined,
    });
  }, [defaultDestinationWeek]);

  /**
   * Check if a date is within valid destination weeks.
   */
  const isDateDisabled = useCallback(
    (date: Date): boolean => {
      const weekInfo = getISOWeekInfo(date);
      const key = `${weekInfo.year}-${weekInfo.weekNumber}`;
      return !validWeekKeys.has(key);
    },
    [validWeekKeys]
  );

  /**
   * Handles date selection from the calendar.
   */
  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) {
        setModalState({ selectedWeek: null, selectedDate: undefined });
        return;
      }

      const weekInfo = getISOWeekInfo(date);
      const key = `${weekInfo.year}-${weekInfo.weekNumber}`;
      const weekOption = weekOptionMap.get(key);

      setModalState({
        selectedWeek: weekOption ?? null,
        selectedDate: date,
      });
    },
    [weekOptionMap]
  );

  /**
   * Quick action: Move to next week.
   */
  const handleNextWeek = useCallback(() => {
    if (!currentWeekNumber) return;
    const nextWeekNum = currentWeekNumber + 1;
    const year = destinationWeeks[0]?.year ?? DateTime.now().weekYear;
    const key = `${year}-${nextWeekNum}`;
    const weekOption = weekOptionMap.get(key);
    if (weekOption) {
      setModalState({
        selectedWeek: weekOption,
        selectedDate: getDateForWeek(year, nextWeekNum),
      });
    }
  }, [currentWeekNumber, destinationWeeks, weekOptionMap]);

  /**
   * Quick action: Move to week after next.
   */
  const handleInTwoWeeks = useCallback(() => {
    if (!currentWeekNumber) return;
    const targetWeekNum = currentWeekNumber + 2;
    const year = destinationWeeks[0]?.year ?? DateTime.now().weekYear;
    const key = `${year}-${targetWeekNum}`;
    const weekOption = weekOptionMap.get(key);
    if (weekOption) {
      setModalState({
        selectedWeek: weekOption,
        selectedDate: getDateForWeek(year, targetWeekNum),
      });
    }
  }, [currentWeekNumber, destinationWeeks, weekOptionMap]);

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

  /**
   * Get calendar default month based on destination weeks.
   */
  const defaultMonth = useMemo(() => {
    if (destinationWeeks.length === 0) return new Date();
    const firstWeek = destinationWeeks[0];
    return getDateForWeek(firstWeek.year, firstWeek.weekNumber);
  }, [destinationWeeks]);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Move goal to week</DialogTitle>
          <DialogDescription>
            Select the week you want to move this goal{goal ? ` (${goal.title})` : ''} to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick action buttons */}
          {currentWeekNumber && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleNextWeek} disabled={isSubmitting}>
                Next Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleInTwoWeeks}
                disabled={isSubmitting}
              >
                In 2 Weeks
              </Button>
            </div>
          )}

          {/* Calendar picker */}
          <div className="space-y-2">
            <Label>Select a week</Label>
            <div className="rounded-md border">
              <Calendar
                mode="single"
                selected={modalState.selectedDate}
                onSelect={handleDateSelect}
                disabled={isDateDisabled}
                defaultMonth={defaultMonth}
                showWeekNumber
                className="rounded-md"
              />
            </div>
            {modalState.selectedWeek && (
              <p className="text-sm text-muted-foreground">
                Selected: {modalState.selectedWeek.label}
              </p>
            )}
          </div>

          {/* Move mode warning */}
          <div className="flex gap-3 rounded-md border border-amber-400/60 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-600/60 dark:bg-amber-950/30 dark:text-amber-200">
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
