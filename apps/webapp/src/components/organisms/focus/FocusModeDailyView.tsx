import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useCallback, useMemo } from 'react';
import { JumpToCurrentButton } from '@/components/molecules/focus/JumpToCurrentButton';
import { PullGoalsButton } from '@/components/molecules/PullGoalsButton';
import { AdhocGoalsSection } from '@/components/organisms/focus/AdhocGoalsSection';
import { FocusModeDailyViewDailyGoals } from '@/components/organisms/focus/FocusModeDailyViewDailyGoals';
import { OnFireGoalsSection } from '@/components/organisms/focus/OnFireGoalsSection';
import { PendingGoalsSection } from '@/components/organisms/focus/PendingGoalsSection';
import { GoalActionsProvider } from '@/contexts/GoalActionsContext';
import { useGoalStatus } from '@/contexts/GoalStatusContext';
import { useCurrentWeekInfo } from '@/hooks/useCurrentDateTime';
import { usePullGoals } from '@/hooks/usePullGoals';
import { useQuarterWeekInfo } from '@/hooks/useQuarterWeekInfo';
import { useWeek, type WeekData, WeekProvider } from '@/hooks/useWeek';
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

/** Props for the inner component - excludes weekData since it uses context */
type FocusModeDailyViewInnerProps = Omit<FocusModeDailyViewProps, 'weekData'>;

// This is the inner component that uses the FireGoals context
// It gets goal data from useWeek() context which includes optimistic updates
const FocusModeDailyViewInner = ({
  year,
  quarter,
  weekNumber,
  selectedDayOfWeek,
  onJumpToCurrent,
  isFocusModeEnabled = false,
}: FocusModeDailyViewInnerProps) => {
  const { fireGoals } = useGoalStatus();
  // Use quarterlyGoals from context - this includes optimistic updates
  const { quarterlyGoals, updateQuarterlyGoalTitle, deleteGoalOptimistic } = useWeek();

  // Get current date info to determine if we're viewing today
  const { weekday: currentDay } = useCurrentWeekInfo();
  const { currentWeekNumber } = useQuarterWeekInfo(year, quarter as 1 | 2 | 3 | 4);

  // Only show pull goals button when viewing today
  const isViewingToday = weekNumber === currentWeekNumber && selectedDayOfWeek === currentDay;

  // Pull goals hook
  const {
    isPulling,
    handlePullGoals,
    dialog: pullGoalsDialog,
  } = usePullGoals({
    weekNumber,
    year,
    quarter,
  });

  // Extract the weeklyGoalsWithQuarterly data for the OnFireGoalsSection
  // Uses quarterlyGoals from context which includes optimistic updates
  const preparedWeeklyGoalsForDay = useCallback(() => {
    if (!quarterlyGoals || quarterlyGoals.length === 0) return [];

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
  }, [quarterlyGoals]);

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

  return (
    <GoalActionsProvider onUpdateGoal={handleUpdateGoal} onDeleteGoal={handleDeleteGoal}>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-end mb-2 gap-2">
          {isViewingToday && (
            <PullGoalsButton
              isPulling={isPulling}
              onPullGoals={handlePullGoals}
              dialog={pullGoalsDialog}
            />
          )}
          <JumpToCurrentButton
            year={year}
            quarter={quarter}
            selectedWeek={weekNumber}
            selectedDay={selectedDayOfWeek}
            onJumpToToday={onJumpToCurrent}
          />
        </div>

        <OnFireGoalsSection
          weeklyGoalsWithQuarterly={weeklyGoalsWithQuarterly}
          selectedDayOfWeek={selectedDayOfWeek}
          weekNumber={weekNumber}
          isFocusModeEnabled={isFocusModeEnabled}
        />

        <AdhocGoalsSection weekNumber={weekNumber} variant="card" showHeader={true} />

        <PendingGoalsSection
          weeklyGoalsWithQuarterly={weeklyGoalsWithQuarterly}
          selectedDayOfWeek={selectedDayOfWeek}
          weekNumber={weekNumber}
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
export const FocusModeDailyView = ({ weekData, ...innerProps }: FocusModeDailyViewProps) => {
  return (
    <WeekProvider weekData={weekData}>
      <FocusModeDailyViewInner {...innerProps} />
    </WeekProvider>
  );
};
