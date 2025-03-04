import { FocusModeDailyViewDailyGoals } from '@/components/organisms/focus/FocusModeDailyViewDailyGoals';
import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';
import { JumpToCurrentButton } from '@/components/molecules/focus/JumpToCurrentButton';
import { FireGoalsProvider, useFireGoals } from '@/contexts/FireGoalsContext';
import { OnFireGoalsSection } from '@/components/organisms/focus/OnFireGoalsSection';
import { useCallback } from 'react';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';

interface FocusModeDailyViewProps {
  year: number;
  quarter: number;
  weekNumber: number;
  weekData: WeekData;
  selectedDayOfWeek: DayOfWeek;
  onJumpToCurrent: (weekNumber: number, dayOfWeek: DayOfWeek) => void;
}

// This is the inner component that uses the FireGoals context
const FocusModeDailyViewInner = ({
  year,
  quarter,
  weekNumber,
  weekData,
  selectedDayOfWeek,
  onJumpToCurrent,
}: FocusModeDailyViewProps) => {
  const { fireGoals, toggleFireStatus, isOnFire } = useFireGoals();

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

  // Handlers for the OnFireGoalsSection
  const handleUpdateGoalTitle = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string) => {
      // This will be handled by the WeekProvider
      const dailyGoalsComponent = document.querySelector(
        'div[data-testid="focus-mode-daily-goals"]'
      );
      if (dailyGoalsComponent) {
        const updateEvent = new CustomEvent('update-goal-title', {
          detail: { goalId, title, details },
        });
        dailyGoalsComponent.dispatchEvent(updateEvent);
      }
    },
    []
  );

  const handleDeleteGoal = useCallback(async (goalId: Id<'goals'>) => {
    // This will be handled by the WeekProvider
    const dailyGoalsComponent = document.querySelector(
      'div[data-testid="focus-mode-daily-goals"]'
    );
    if (dailyGoalsComponent) {
      const deleteEvent = new CustomEvent('delete-goal', {
        detail: { goalId },
      });
      dailyGoalsComponent.dispatchEvent(deleteEvent);
    }
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-end mb-2">
        <JumpToCurrentButton
          viewMode="daily"
          year={year}
          quarter={quarter}
          selectedWeek={weekNumber}
          selectedDay={selectedDayOfWeek}
          onJumpToCurrentDay={onJumpToCurrent}
        />
      </div>

      <WeekProviderWithoutDashboard weekData={weekData}>
        <OnFireGoalsSection
          weeklyGoalsWithQuarterly={preparedWeeklyGoalsForDay()}
          selectedDayOfWeek={selectedDayOfWeek}
          onUpdateGoalTitle={handleUpdateGoalTitle}
          onDeleteGoal={handleDeleteGoal}
          fireGoals={fireGoals}
          toggleFireStatus={toggleFireStatus}
        />

        <div data-testid="focus-mode-daily-goals">
          <FocusModeDailyViewDailyGoals
            weekNumber={weekNumber}
            year={year}
            quarter={quarter}
            selectedDayOfWeek={selectedDayOfWeek}
            fireGoals={fireGoals}
            toggleFireStatus={toggleFireStatus}
          />
        </div>
      </WeekProviderWithoutDashboard>
    </div>
  );
};

// This is the outer component that provides the FireGoals context
export const FocusModeDailyView = (props: FocusModeDailyViewProps) => {
  return (
    <FireGoalsProvider>
      <FocusModeDailyViewInner {...props} />
    </FireGoalsProvider>
  );
};
