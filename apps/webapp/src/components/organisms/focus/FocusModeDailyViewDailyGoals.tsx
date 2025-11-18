// 1. Imports (external first, then internal)
import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { DateTime } from 'luxon';
import { useCallback, useMemo, useState } from 'react';
import {
  DayContainer,
  wasCompletedToday,
} from '@/components/molecules/day-of-week/containers/DayContainer';
import { AdhocGoalsSection } from '@/components/organisms/focus/AdhocGoalsSection';
import { useWeek } from '@/hooks/useWeek';
import type { DayOfWeek, DayOfWeekType } from '@/lib/constants';

// 2. Public interfaces and types
/**
 * Props for the FocusModeDailyViewDailyGoals component.
 * Displays daily goals for a specific day in focus mode with full goal management capabilities.
 *
 * @example
 * ```typescript
 * <FocusModeDailyViewDailyGoals
 *   weekNumber={42}
 *   year={2024}
 *   selectedDayOfWeek="monday"
 * />
 * ```
 */
export interface FocusModeDailyViewDailyGoalsProps {
  /** Week number within the year (1-53) */
  weekNumber: number;
  /** Year for the week calculation */
  year: number;
  /** Selected day of the week to display goals for */
  selectedDayOfWeek: DayOfWeek;
}

// 3. Internal interfaces and types (prefixed with _)
interface _DayData {
  dayOfWeek: DayOfWeekType;
  date: string;
  dateTimestamp: number;
}

interface _WeeklyGoalWithQuarterly {
  weeklyGoal: GoalWithDetailsAndChildren;
  quarterlyGoal: GoalWithDetailsAndChildren;
}

// 4. Main exported functions/components
/**
 * Focus mode daily view component for displaying and managing daily goals.
 * Provides a focused interface for working with goals on a specific day, including
 * creation, editing, deletion, and completion tracking with optimistic updates.
 *
 * Features:
 * - Displays daily goals sorted by completion status and quarterly goal priority
 * - Supports creating new daily and weekly goals
 * - Handles goal updates and deletions with optimistic UI updates
 * - Filters and sorts goals based on quarterly goal starred/pinned status
 * - Shows goals completed today even if weekly goal is marked complete
 */
export const FocusModeDailyViewDailyGoals = ({
  weekNumber,
  year,
  selectedDayOfWeek,
}: FocusModeDailyViewDailyGoalsProps) => {
  const {
    days,
    weeklyGoals,
    quarterlyGoals,
    createDailyGoalOptimistic,
    createWeeklyGoalOptimistic,
    deleteGoalOptimistic,
    updateQuarterlyGoalTitle,
  } = useWeek();

  // Add state to track which goals are being created
  const [creatingGoals, setCreatingGoals] = useState<Record<string, boolean>>({});

  /**
   * Finds the current day data for the selected day of week.
   * Extracts day information including date and timestamp for goal operations.
   */
  const currentDay = useMemo((): _DayData | undefined => {
    const currentDayData = (days as _DayData[]).find((day) => day.dayOfWeek === selectedDayOfWeek);
    return currentDayData;
  }, [days, selectedDayOfWeek]);

  /**
   * Sorts daily goals by completion status, quarterly goal priority, and title.
   * Incomplete goals appear first, then sorted by quarterly goal starred/pinned status,
   * quarterly goal title, weekly goal title, and finally daily goal title.
   *
   * @param goals - Array of daily goals to sort
   * @returns Sorted array of daily goals
   */
  const _sortDailyGoals = useCallback(
    (goals: GoalWithDetailsAndChildren[]) => {
      return [...goals].sort((a, b) => {
        // First sort by completion status
        if (!a.isComplete && b.isComplete) return -1;
        if (a.isComplete && !b.isComplete) return 1;

        // Get parent weekly goals
        const weeklyGoalA = weeklyGoals.find((g) => g._id === a.parentId);
        const weeklyGoalB = weeklyGoals.find((g) => g._id === b.parentId);

        // Get parent quarterly goals
        const quarterlyGoalA = weeklyGoalA
          ? quarterlyGoals.find((g) => g._id === weeklyGoalA.parentId)
          : null;
        const quarterlyGoalB = weeklyGoalB
          ? quarterlyGoals.find((g) => g._id === weeklyGoalB.parentId)
          : null;

        // Sort by quarterly goal priority
        if (quarterlyGoalA && quarterlyGoalB) {
          // Sort by starred status
          if (quarterlyGoalA.state?.isStarred && !quarterlyGoalB.state?.isStarred) return -1;
          if (!quarterlyGoalA.state?.isStarred && quarterlyGoalB.state?.isStarred) return 1;

          // Sort by pinned status
          if (quarterlyGoalA.state?.isPinned && !quarterlyGoalB.state?.isPinned) return -1;
          if (!quarterlyGoalA.state?.isPinned && quarterlyGoalB.state?.isPinned) return 1;

          // If same priority, sort by quarterly goal title
          const quarterlyCompare = quarterlyGoalA.title.localeCompare(quarterlyGoalB.title);
          if (quarterlyCompare !== 0) return quarterlyCompare;

          // If same quarterly goal, sort by weekly goal title
          if (weeklyGoalA && weeklyGoalB) {
            const weeklyCompare = weeklyGoalA.title.localeCompare(weeklyGoalB.title);
            if (weeklyCompare !== 0) return weeklyCompare;
          }
        }

        // Finally sort by daily goal title
        return a.title.localeCompare(b.title);
      });
    },
    [weeklyGoals, quarterlyGoals]
  );

  /**
   * Prepares weekly goals with their quarterly parents for the selected day.
   * Filters out completed weekly goals (except those completed today) and sorts
   * them by quarterly goal priority (starred > pinned > title).
   *
   * @returns Array of weekly goals with their quarterly parent information
   */
  const preparedWeeklyGoalsForDay = useMemo((): _WeeklyGoalWithQuarterly[] => {
    // Get all weekly goals with valid parents that aren't completed
    // We no longer filter out weekly goals without daily goals here since DayContainer in 'focus' mode handles that
    const validWeeklyGoals = [...weeklyGoals]
      .filter((weeklyGoal) => {
        // Check if weekly goal has a valid parent
        if (!weeklyGoal.parentId) {
          return false;
        }

        // Filter out completed weekly goals unless they were completed today
        if (weeklyGoal.isComplete) {
          // Get the current day's date timestamp
          const currentDayData = (days as _DayData[]).find(
            (day) => day.dayOfWeek === selectedDayOfWeek
          );

          if (currentDayData && wasCompletedToday(weeklyGoal, currentDayData.dateTimestamp)) {
            return true; // Include goals completed today
          }
          return false; // Filter out other completed goals
        }

        return true;
      })
      .map((weeklyGoal) => {
        const parentQuarterlyGoal = quarterlyGoals.find((g) => g._id === weeklyGoal.parentId);
        if (!parentQuarterlyGoal) {
          console.warn(
            `Weekly goal ${weeklyGoal._id} has parentId ${weeklyGoal.parentId} but parent not found in quarterlyGoals`
          );
          return null;
        }
        return {
          weeklyGoal,
          quarterlyGoal: parentQuarterlyGoal,
        } as _WeeklyGoalWithQuarterly;
      })
      .filter((item): item is _WeeklyGoalWithQuarterly => item !== null);

    // Group weekly goals by their quarterly parent ID
    const groupedByQuarterlyGoal: Record<string, _WeeklyGoalWithQuarterly[]> = {};
    validWeeklyGoals.forEach((item) => {
      const quarterlyId = item.quarterlyGoal._id;
      if (!groupedByQuarterlyGoal[quarterlyId]) {
        groupedByQuarterlyGoal[quarterlyId] = [];
      }
      groupedByQuarterlyGoal[quarterlyId].push(item);
    });

    // Sort weekly goals within each quarterly group
    Object.values(groupedByQuarterlyGoal).forEach((group) => {
      group.sort((a, b) => {
        // First by completion status (already filtered for incomplete, but keeping for future flexibility)
        if (!a.weeklyGoal.isComplete && b.weeklyGoal.isComplete) return -1;
        if (a.weeklyGoal.isComplete && !b.weeklyGoal.isComplete) return 1;

        // Then by title
        return a.weeklyGoal.title.localeCompare(b.weeklyGoal.title);
      });
    });

    // Sort quarterly groups and flatten the result
    return Object.entries(groupedByQuarterlyGoal)
      .sort(([, groupA], [, groupB]) => {
        if (groupA.length === 0 || groupB.length === 0) return 0;

        const a = groupA[0].quarterlyGoal;
        const b = groupB[0].quarterlyGoal;

        // Sort by starred status first
        const aStarred = a.state?.isStarred ?? false;
        const bStarred = b.state?.isStarred ?? false;
        if (aStarred && !bStarred) return -1;
        if (!aStarred && bStarred) return 1;

        // Then sort by pinned status
        const aPinned = a.state?.isPinned ?? false;
        const bPinned = b.state?.isPinned ?? false;
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;

        // Finally sort by title
        return a.title.localeCompare(b.title);
      })
      .flatMap(([, group]) => group);
  }, [weeklyGoals, quarterlyGoals, days, selectedDayOfWeek]);

  /**
   * Handles updating goal title, details, and due date with optimistic updates.
   *
   * @param goalId - ID of the goal to update
   * @param title - New title for the goal
   * @param details - Optional details/description for the goal
   * @param dueDate - Optional due date timestamp for the goal
   * @returns Promise resolving when update is complete
   */
  const handleUpdateGoalTitle = useCallback(
    (goalId: Id<'goals'>, title: string, details?: string, dueDate?: number) => {
      return updateQuarterlyGoalTitle({ goalId, title, details, dueDate });
    },
    [updateQuarterlyGoalTitle]
  );

  /**
   * Handles deleting a goal with optimistic updates.
   *
   * @param goalId - ID of the goal to delete
   * @returns Promise resolving when deletion is complete
   */
  const handleDeleteGoal = useCallback(
    async (goalId: Id<'goals'>): Promise<void> => {
      await deleteGoalOptimistic(goalId);
    },
    [deleteGoalOptimistic]
  );

  /**
   * Handles creating a new daily goal with optimistic updates.
   * Calculates the date timestamp based on week number, year, and day of week.
   *
   * @param weeklyGoalId - ID of the parent weekly goal
   * @param title - Title for the new daily goal
   * @param forDayOfWeek - Optional day of week override (defaults to selectedDayOfWeek)
   * @returns Promise resolving when creation is complete
   */
  const handleCreateDailyGoal = useCallback(
    async (weeklyGoalId: Id<'goals'>, title: string, forDayOfWeek?: DayOfWeek): Promise<void> => {
      // Use the provided day of week if available, otherwise fall back to the selected day
      const dayOfWeekToUse = forDayOfWeek ?? selectedDayOfWeek;

      const dateTimestamp = DateTime.fromObject({
        weekNumber,
        weekYear: year,
      })
        .startOf('week')
        .plus({ days: dayOfWeekToUse - 1 })
        .toMillis();

      // Set the creating state for this weekly goal
      setCreatingGoals((prev) => ({ ...prev, [weeklyGoalId]: true }));

      try {
        await createDailyGoalOptimistic(weeklyGoalId, title, dayOfWeekToUse, dateTimestamp);
      } catch (error) {
        console.error('Failed to create daily goal:', error);
      } finally {
        // Clear the creating state
        setCreatingGoals((prev) => {
          const newState = { ...prev };
          delete newState[weeklyGoalId];
          return newState;
        });
      }
    },
    [weekNumber, year, selectedDayOfWeek, createDailyGoalOptimistic]
  );

  /**
   * Handles creating a new weekly goal with optimistic updates.
   *
   * @param quarterlyGoalId - ID of the parent quarterly goal
   * @param title - Title for the new weekly goal
   * @returns Promise resolving when creation is complete
   */
  const handleCreateWeeklyGoal = useCallback(
    async (quarterlyGoalId: Id<'goals'>, title: string): Promise<void> => {
      await createWeeklyGoalOptimistic(quarterlyGoalId, title);
    },
    [createWeeklyGoalOptimistic]
  );

  // If the current day doesn't exist, don't render anything
  if (!currentDay) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Daily Goals Section */}
      <DayContainer
        dayOfWeek={currentDay.dayOfWeek}
        weekNumber={weekNumber}
        dateTimestamp={currentDay.dateTimestamp}
        weeklyGoalsWithQuarterly={preparedWeeklyGoalsForDay}
        onUpdateGoal={handleUpdateGoalTitle}
        onDeleteGoal={handleDeleteGoal}
        onCreateDailyGoal={handleCreateDailyGoal}
        onCreateWeeklyGoal={handleCreateWeeklyGoal}
        sortDailyGoals={_sortDailyGoals}
        mode="focus"
        isCreating={creatingGoals}
      />

      {/* Adhoc Goals Section */}
      <AdhocGoalsSection weekNumber={weekNumber} dayOfWeek={selectedDayOfWeek} />
    </div>
  );
};
