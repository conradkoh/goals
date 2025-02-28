import { DayOfWeek, DayOfWeekType, getDayName } from '@/lib/constants';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import {
  DayContainer,
  wasCompletedToday,
} from '@/components/core/day-of-week/containers/DayContainer';
import { GoalWithOptimisticStatus, useWeek } from '@/hooks/useWeek';
import { useGoalActions } from '@/hooks/useGoalActions';

export interface FocusModeDailyViewDailyGoalsProps {
  weekNumber: number;
  year: number;
  quarter: number;
  selectedDayOfWeek: DayOfWeek;
}

export const FocusModeDailyViewDailyGoals = ({
  weekNumber,
  year,
  quarter,
  selectedDayOfWeek,
}: FocusModeDailyViewDailyGoalsProps) => {
  const {
    days,
    weeklyGoals,
    quarterlyGoals,
    createDailyGoalOptimistic,
    dailyGoals,
    deleteDailyGoalOptimistic,
  } = useWeek();
  const { updateQuarterlyGoalTitle } = useGoalActions();

  // Find the current day data
  const currentDay = useMemo(() => {
    const currentDayData = (
      days as Array<{
        dayOfWeek: DayOfWeekType;
        date: string;
        dateTimestamp: number;
      }>
    ).find((day) => day.dayOfWeek === selectedDayOfWeek);

    return currentDayData;
  }, [days, selectedDayOfWeek]);

  // Function to sort daily goals
  const sortDailyGoals = (goals: GoalWithDetailsAndChildren[]) => {
    return [...goals].sort((a, b) => {
      // First sort by completion status
      if (!a.state?.isComplete && b.state?.isComplete) return -1;
      if (a.state?.isComplete && !b.state?.isComplete) return 1;

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
        if (quarterlyGoalA.state?.isStarred && !quarterlyGoalB.state?.isStarred)
          return -1;
        if (!quarterlyGoalA.state?.isStarred && quarterlyGoalB.state?.isStarred)
          return 1;

        // Sort by pinned status
        if (quarterlyGoalA.state?.isPinned && !quarterlyGoalB.state?.isPinned)
          return -1;
        if (!quarterlyGoalA.state?.isPinned && quarterlyGoalB.state?.isPinned)
          return 1;

        // If same priority, sort by quarterly goal title
        const quarterlyCompare = quarterlyGoalA.title.localeCompare(
          quarterlyGoalB.title
        );
        if (quarterlyCompare !== 0) return quarterlyCompare;

        // If same quarterly goal, sort by weekly goal title
        if (weeklyGoalA && weeklyGoalB) {
          const weeklyCompare = weeklyGoalA.title.localeCompare(
            weeklyGoalB.title
          );
          if (weeklyCompare !== 0) return weeklyCompare;
        }
      }

      // Finally sort by daily goal title
      return a.title.localeCompare(b.title);
    });
  };

  // Prepare weekly goals with children for the selected day
  const preparedWeeklyGoalsForDay = useMemo(() => {
    // Get all weekly goals with valid parents that aren't completed
    // We no longer filter out weekly goals without daily goals here since DayContainer in 'focus' mode handles that
    const validWeeklyGoals = [...weeklyGoals]
      .filter((weeklyGoal) => {
        // Check if weekly goal has a valid parent
        if (!weeklyGoal.parentId) {
          return false;
        }

        // Filter out completed weekly goals unless they were completed today
        if (weeklyGoal.state?.isComplete) {
          // Get the current day's date timestamp
          const currentDayData = (
            days as Array<{
              dayOfWeek: DayOfWeekType;
              date: string;
              dateTimestamp: number;
            }>
          ).find((day) => day.dayOfWeek === selectedDayOfWeek);

          if (
            currentDayData &&
            wasCompletedToday(weeklyGoal, currentDayData.dateTimestamp)
          ) {
            return true; // Include goals completed today
          }
          return false; // Filter out other completed goals
        }

        return true;
      })
      .map((weeklyGoal) => {
        const parentQuarterlyGoal = quarterlyGoals.find(
          (g) => g._id === weeklyGoal.parentId
        );
        if (!parentQuarterlyGoal) {
          console.warn(
            `Weekly goal ${weeklyGoal._id} has parentId ${weeklyGoal.parentId} but parent not found in quarterlyGoals`
          );
          return null;
        }
        return {
          weeklyGoal,
          quarterlyGoal: parentQuarterlyGoal,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Group weekly goals by their quarterly parent ID
    const groupedByQuarterlyGoal: Record<string, typeof validWeeklyGoals> = {};
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
        if (!a.weeklyGoal.state?.isComplete && b.weeklyGoal.state?.isComplete)
          return -1;
        if (a.weeklyGoal.state?.isComplete && !b.weeklyGoal.state?.isComplete)
          return 1;

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
  }, [weeklyGoals, quarterlyGoals]);

  const handleUpdateGoalTitle = (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => {
    return updateQuarterlyGoalTitle({ goalId, title, details });
  };

  const handleDeleteGoal = async (goalId: Id<'goals'>): Promise<void> => {
    const goal = dailyGoals.find((g) => g._id === goalId);
    if (!goal || !goal.state?.daily?.dayOfWeek) return;
    await deleteDailyGoalOptimistic(goalId);
  };

  const handleCreateGoal = async (
    weeklyGoalId: Id<'goals'>,
    title: string
  ): Promise<void> => {
    const dateTimestamp = DateTime.fromObject({
      weekNumber,
      weekYear: year,
    })
      .startOf('week')
      .plus({ days: selectedDayOfWeek - 1 })
      .toMillis();

    await createDailyGoalOptimistic(
      weeklyGoalId,
      title,
      selectedDayOfWeek,
      dateTimestamp
    );
  };

  // If the current day doesn't exist, don't render anything
  if (!currentDay) {
    return null;
  }

  return (
    <div className="space-y-2">
      <DayContainer
        dayOfWeek={currentDay.dayOfWeek}
        weekNumber={weekNumber}
        dateTimestamp={currentDay.dateTimestamp}
        weeklyGoalsWithQuarterly={preparedWeeklyGoalsForDay}
        onUpdateGoalTitle={handleUpdateGoalTitle}
        onDeleteGoal={handleDeleteGoal}
        onCreateGoal={handleCreateGoal}
        sortDailyGoals={sortDailyGoals}
        mode="focus"
      />
    </div>
  );
};
