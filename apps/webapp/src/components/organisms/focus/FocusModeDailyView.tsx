import { FocusModeDailyViewDailyGoals } from '@/components/organisms/focus/FocusModeDailyViewDailyGoals';
import {
  WeekData,
  WeekProviderWithoutDashboard,
  useWeek,
} from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';
import { JumpToCurrentButton } from '@/components/molecules/focus/JumpToCurrentButton';
import { FireGoalsProvider, useFireGoals } from '@/contexts/FireGoalsContext';
import { OnFireGoalsSection } from '@/components/organisms/focus/OnFireGoalsSection';
import { useCallback, useMemo, useState } from 'react';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useDashboard } from '@/hooks/useDashboard';

interface FocusModeDailyViewProps {
  year: number;
  quarter: number;
  weekNumber: number;
  weekData: WeekData;
  selectedDayOfWeek: DayOfWeek;
  onJumpToCurrent: (weekNumber: number, dayOfWeek: DayOfWeek) => void;
  isFocusModeEnabled?: boolean;
}

// This is the inner component that uses the FireGoals context
const FocusModeDailyViewInner = ({
  year,
  quarter,
  weekNumber,
  weekData,
  selectedDayOfWeek,
  onJumpToCurrent,
  isFocusModeEnabled = false,
}: FocusModeDailyViewProps) => {
  const { fireGoals, toggleFireStatus, isOnFire } = useFireGoals();
  const { updateQuarterlyGoalTitle, deleteGoalOptimistic } = useWeek();
  const { toggleFocusMode } = useDashboard();

  // Extract the weeklyGoalsWithQuarterly data for the OnFireGoalsSection
  const preparedWeeklyGoalsForDay = useCallback(() => {
    if (!weekData.tree) return [];

    const quarterlyGoals = weekData.tree.quarterlyGoals || [];
    // We need to extract weekly goals from the quarterly goals' children
    const weeklyGoals: GoalWithDetailsAndChildren[] = [];

    // Collect all weekly goals from quarterly goals
    quarterlyGoals.forEach((quarterlyGoal) => {
      if (quarterlyGoal.children && quarterlyGoal.children.length > 0) {
        weeklyGoals.push(...quarterlyGoal.children);
      }
    });

    // Get all weekly goals with valid parents
    return weeklyGoals
      .filter((weeklyGoal) => {
        // Check if weekly goal has a valid parent
        return !!weeklyGoal.parentId;
      })
      .map((weeklyGoal) => {
        const parentQuarterlyGoal = quarterlyGoals.find(
          (g) => g._id === weeklyGoal.parentId
        );
        if (!parentQuarterlyGoal) {
          return null;
        }
        return {
          weeklyGoal,
          quarterlyGoal: parentQuarterlyGoal,
        };
      })
      .filter(
        (
          item: {
            weeklyGoal: GoalWithDetailsAndChildren;
            quarterlyGoal: GoalWithDetailsAndChildren;
          } | null
        ): item is {
          weeklyGoal: GoalWithDetailsAndChildren;
          quarterlyGoal: GoalWithDetailsAndChildren;
        } => item !== null
      );
  }, [weekData]);

  // Determine if there are any fire goals to display
  const hasFireGoals = useMemo(() => {
    return fireGoals.size > 0;
  }, [fireGoals]);

  // Check if there are any fire goals for the current day
  const hasVisibleFireGoalsForCurrentDay = useMemo(() => {
    if (fireGoals.size === 0) return false;

    const weeklyGoalsWithQuarterly = preparedWeeklyGoalsForDay();

    // Check if any weekly goals are on fire
    const hasOnFireWeeklyGoals = weeklyGoalsWithQuarterly.some(
      ({ weeklyGoal }) => fireGoals.has(weeklyGoal._id.toString())
    );

    if (hasOnFireWeeklyGoals) return true;

    // Check if any daily goals for the selected day are on fire
    const hasOnFireDailyGoals = weeklyGoalsWithQuarterly.some(
      ({ weeklyGoal }) =>
        weeklyGoal.children.some(
          (dailyGoal) =>
            dailyGoal.state?.daily?.dayOfWeek === selectedDayOfWeek &&
            fireGoals.has(dailyGoal._id.toString())
        )
    );

    return hasOnFireDailyGoals;
  }, [fireGoals, preparedWeeklyGoalsForDay, selectedDayOfWeek]);

  // Handlers for the OnFireGoalsSection
  const handleUpdateGoalTitle = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string) => {
      try {
        await updateQuarterlyGoalTitle({
          goalId,
          title,
          details,
        });
      } catch (error) {
        console.error('Failed to update goal title:', error);
      }
    },
    [updateQuarterlyGoalTitle]
  );

  const handleDeleteGoal = useCallback(
    async (goalId: Id<'goals'>) => {
      try {
        await deleteGoalOptimistic(goalId);
      } catch (error) {
        console.error('Failed to delete goal:', error);
      }
    },
    [deleteGoalOptimistic]
  );

  // Determine if content should be hidden
  // Only hide content when there are visible fire goals for the current day AND focus mode is enabled
  const shouldHideContent = useMemo(() => {
    return hasVisibleFireGoalsForCurrentDay && isFocusModeEnabled;
  }, [hasVisibleFireGoalsForCurrentDay, isFocusModeEnabled]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-end mb-2 gap-2">
        <JumpToCurrentButton
          viewMode="daily"
          year={year}
          quarter={quarter}
          selectedWeek={weekNumber}
          selectedDay={selectedDayOfWeek}
          onJumpToCurrentDay={onJumpToCurrent}
        />
      </div>

      <OnFireGoalsSection
        weeklyGoalsWithQuarterly={preparedWeeklyGoalsForDay()}
        selectedDayOfWeek={selectedDayOfWeek}
        onUpdateGoalTitle={handleUpdateGoalTitle}
        onDeleteGoal={handleDeleteGoal}
        isFocusModeEnabled={isFocusModeEnabled}
        toggleFocusMode={toggleFocusMode}
      />

      {!shouldHideContent && (
        <div data-testid="focus-mode-daily-goals">
          <FocusModeDailyViewDailyGoals
            weekNumber={weekNumber}
            year={year}
            quarter={quarter}
            selectedDayOfWeek={selectedDayOfWeek}
          />
        </div>
      )}
    </div>
  );
};

// This is the outer component that provides the FireGoals context
export const FocusModeDailyView = (props: FocusModeDailyViewProps) => {
  return (
    <WeekProviderWithoutDashboard weekData={props.weekData}>
      <FireGoalsProvider>
        <FocusModeDailyViewInner {...props} />
      </FireGoalsProvider>
    </WeekProviderWithoutDashboard>
  );
};
