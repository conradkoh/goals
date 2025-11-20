import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useCallback, useMemo } from 'react';
import { JumpToCurrentButton } from '@/components/molecules/focus/JumpToCurrentButton';
import { TaskPullActionMenu } from '@/components/molecules/focus/TaskPullActionMenu';
import { AdhocGoalsSection } from '@/components/organisms/focus/AdhocGoalsSection';
import { FocusModeDailyViewDailyGoals } from '@/components/organisms/focus/FocusModeDailyViewDailyGoals';
import { OnFireGoalsSection } from '@/components/organisms/focus/OnFireGoalsSection';
import { PendingGoalsSection } from '@/components/organisms/focus/PendingGoalsSection';
import { GoalActionsProvider } from '@/contexts/GoalActionsContext';
import { useGoalStatus } from '@/contexts/GoalStatusContext';
import { useWeek, type WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import type { DayOfWeek } from '@/lib/constants';

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
  const { fireGoals } = useGoalStatus();
  const { updateQuarterlyGoalTitle, deleteGoalOptimistic } = useWeek();

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
        const parentQuarterlyGoal = quarterlyGoals.find((g) => g._id === weeklyGoal.parentId);
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

  // Memoize the prepared weekly goals to avoid recalculation on every render
  const weeklyGoalsWithQuarterly = useMemo(() => {
    return preparedWeeklyGoalsForDay();
  }, [preparedWeeklyGoalsForDay]);

  // Determine if there are any fire goals to display
  const _hasFireGoals = useMemo(() => {
    return fireGoals.size > 0;
  }, [fireGoals]);

  // Check if there are any fire goals for the current day
  const hasVisibleFireGoalsForCurrentDay = useMemo(() => {
    if (fireGoals.size === 0) return false;

    // Check if any weekly goals are on fire
    const hasOnFireWeeklyGoals = weeklyGoalsWithQuarterly.some(({ weeklyGoal }) =>
      fireGoals.has(weeklyGoal._id.toString())
    );

    if (hasOnFireWeeklyGoals) return true;

    // Check if any daily goals for the selected day are on fire
    const hasOnFireDailyGoals = weeklyGoalsWithQuarterly.some(({ weeklyGoal }) =>
      weeklyGoal.children.some(
        (dailyGoal) =>
          dailyGoal.state?.daily?.dayOfWeek === selectedDayOfWeek &&
          fireGoals.has(dailyGoal._id.toString())
      )
    );

    return hasOnFireDailyGoals;
  }, [fireGoals, weeklyGoalsWithQuarterly, selectedDayOfWeek]);

  // Handlers for the OnFireGoalsSection
  const handleUpdateGoal = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string, dueDate?: number) => {
      try {
        await updateQuarterlyGoalTitle({
          goalId,
          title,
          details,
          dueDate,
        });
      } catch (error) {
        console.error('Failed to update goal:', error);
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

  // Get current day data for the action menu
  const currentDay = useMemo(() => {
    const currentDayData = weekData.days?.find((day) => day.dayOfWeek === selectedDayOfWeek);
    return currentDayData;
  }, [weekData.days, selectedDayOfWeek]);

  return (
    <GoalActionsProvider onUpdateGoal={handleUpdateGoal} onDeleteGoal={handleDeleteGoal}>
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

        {/* Task Pull Action Menu - above urgent items section */}
        {currentDay && (
          <TaskPullActionMenu
            dayOfWeek={selectedDayOfWeek}
            weekNumber={weekNumber}
            dateTimestamp={currentDay.dateTimestamp}
          />
        )}

        <OnFireGoalsSection
          weeklyGoalsWithQuarterly={weeklyGoalsWithQuarterly}
          selectedDayOfWeek={selectedDayOfWeek}
          weekNumber={weekNumber}
          isFocusModeEnabled={isFocusModeEnabled}
        />

        <AdhocGoalsSection
          weekNumber={weekNumber}
          dayOfWeek={selectedDayOfWeek}
          variant="card"
          showHeader={true}
        />

        <PendingGoalsSection
          weeklyGoalsWithQuarterly={weeklyGoalsWithQuarterly}
          selectedDayOfWeek={selectedDayOfWeek}
        />

        {!shouldHideContent && (
          <div data-testid="focus-mode-daily-goals">
            <FocusModeDailyViewDailyGoals
              weekNumber={weekNumber}
              year={year}
              selectedDayOfWeek={selectedDayOfWeek}
            />
          </div>
        )}
      </div>
    </GoalActionsProvider>
  );
};

// This is the outer component that provides the week context
export const FocusModeDailyView = (props: FocusModeDailyViewProps) => {
  return (
    <WeekProviderWithoutDashboard weekData={props.weekData}>
      <FocusModeDailyViewInner {...props} />
    </WeekProviderWithoutDashboard>
  );
};
