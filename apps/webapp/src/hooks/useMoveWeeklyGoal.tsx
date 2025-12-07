import { api } from '@workspace/backend/convex/_generated/api';
import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { useMutation, useQuery } from 'convex/react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useSession } from '@/modules/auth/useSession';
/**
 * Represents a week option available for goal movement within a quarter.
 * Used by the frontend to display week selection options in the move modal.
 */
export type WeekOption = {
  /** The year of the week */
  year: number;
  /** The quarter number (1-4) */
  quarter: number;
  /** The week number within the quarter */
  weekNumber: number;
  /** Human-readable label for display (e.g., "Week 42 (next)") */
  label: string;
};

/**
 * Move mode determining how child goals are handled during weekly goal movement.
 * - move_all: Moves the weekly goal and all incomplete children (or all if no completed children)
 * - copy_children: Copies the weekly goal to target week, moves only incomplete children, preserves completed children in original week
 */
export type MoveMode = 'move_all' | 'copy_children';

/**
 * Return type for the useMoveWeeklyGoal hook containing all state and functions for goal movement.
 */
export interface UseMoveWeeklyGoalReturn {
  /** Available destination weeks for selection */
  destinationWeeks: WeekOption[];
  /** Default week to pre-select in the dropdown */
  defaultDestinationWeek: WeekOption | null;
  /** Function to open the move modal for a specific goal */
  openMoveModal: (goal: GoalWithDetailsAndChildren) => void;
  /** Function to close the move modal */
  closeMoveModal: () => void;
  /** Function to execute the move operation */
  moveGoalToWeek: (
    goal: GoalWithDetailsAndChildren,
    destinationWeek?: WeekOption | null
  ) => Promise<void>;
  /** Current modal state containing goal and open status */
  modalState: _MoveGoalToWeekState;
  /** Function to determine move mode based on goal's child completion status */
  getMoveMode: (goal: GoalWithDetailsAndChildren) => MoveMode;
  /** Whether the move operation is currently in progress */
  isSubmitting: boolean;
}

interface _MoveGoalToWeekState {
  goal?: GoalWithDetailsAndChildren;
  isOpen: boolean;
}
/**
 * Hook for managing weekly goal movement functionality.
 * Provides modal state management, week selection, and move operation execution.
 * Handles authentication, validation, and user feedback through toast notifications.
 *
 * @param year - Current year for week calculations
 * @param quarter - Current quarter (1-4) for week calculations
 * @param currentWeekNumber - Current week number within the quarter
 * @returns Object containing all state and functions for goal movement
 *
 * @example
 * ```typescript
 * const {
 *   destinationWeeks,
 *   openMoveModal,
 *   closeMoveModal,
 *   moveGoalToWeek,
 *   modalState,
 *   getMoveMode,
 *   isSubmitting
 * } = useMoveWeeklyGoal(2024, 3, 42);
 *
 * // Open modal for a weekly goal
 * openMoveModal(weeklyGoal);
 *
 * // Move goal to specific week
 * await moveGoalToWeek(weeklyGoal, selectedWeek);
 * ```
 */
export function useMoveWeeklyGoal(
  year: number,
  quarter: number,
  currentWeekNumber: number
): UseMoveWeeklyGoalReturn {
  const { sessionId } = useSession();
  const moveWeeklyGoalMutation = useMutation(api.goal.moveWeeklyGoalToWeek);
  const [modalState, setModalState] = useState<_MoveGoalToWeekState>({ isOpen: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableWeeks = useQuery(api.goal.getAvailableWeeks, {
    sessionId,
    currentWeek: {
      year,
      quarter,
      weekNumber: currentWeekNumber,
    },
  });

  /**
   * Memoized destination weeks from the query result.
   */
  const destinationWeeks: WeekOption[] = useMemo(() => availableWeeks ?? [], [availableWeeks]);

  /**
   * Memoized default destination week (next week or first available).
   */
  const defaultDestinationWeek = useMemo(() => {
    if (!destinationWeeks.length) return null;
    const next = destinationWeeks.find((week) => week.weekNumber > currentWeekNumber);
    return next ?? destinationWeeks[0];
  }, [destinationWeeks, currentWeekNumber]);

  /**
   * Determines the appropriate move mode based on child goal completion status.
   *
   * @param goal - The goal to analyze for move mode
   * @returns Move mode: 'move_all' if no children or all incomplete, 'copy_children' if some completed
   */
  const getMoveMode = useCallback((goal: GoalWithDetailsAndChildren): MoveMode => {
    const children: Doc<'goals'>[] = goal.children ?? [];
    if (!children.length) {
      return 'move_all';
    }
    const hasCompletedChild = children.some((child) => child.isComplete);
    return hasCompletedChild ? 'copy_children' : 'move_all';
  }, []);

  /**
   * Opens the move modal for a specific weekly goal.
   *
   * @param goal - The weekly goal to move
   */
  const openMoveModal = useCallback((goal: GoalWithDetailsAndChildren) => {
    if (!goal || goal.depth !== 1) return;
    setModalState({ goal, isOpen: true });
  }, []);

  /**
   * Closes the move modal and resets state.
   */
  const closeMoveModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  /**
   * Executes the move operation for a weekly goal to a destination week.
   * Handles authentication, validation, and user feedback.
   *
   * @param goal - The weekly goal to move
   * @param destinationWeek - Optional specific destination week, defaults to next week
   */
  const moveGoalToWeek = useCallback(
    async (goal: GoalWithDetailsAndChildren, destinationWeek?: WeekOption | null) => {
      if (!sessionId) {
        console.error('Not authenticated: Please log in to move goals');
        return;
      }

      const target = destinationWeek ?? defaultDestinationWeek;
      if (!target) {
        console.error('No destination weeks available to move this goal');
        return;
      }

      try {
        setIsSubmitting(true);
        await moveWeeklyGoalMutation({
          sessionId,
          goalId: goal._id,
          currentWeek: {
            year,
            quarter,
            weekNumber: currentWeekNumber,
          },
          targetWeek: {
            year: target.year,
            quarter: target.quarter,
            weekNumber: target.weekNumber,
          },
        });

        closeMoveModal();
      } catch (error) {
        console.error('Failed to move goal:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to move goal',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      sessionId,
      moveWeeklyGoalMutation,
      year,
      quarter,
      currentWeekNumber,
      defaultDestinationWeek,
      closeMoveModal,
    ]
  );

  return {
    destinationWeeks,
    defaultDestinationWeek,
    openMoveModal,
    closeMoveModal,
    moveGoalToWeek,
    modalState,
    getMoveMode,
    isSubmitting,
  };
}
