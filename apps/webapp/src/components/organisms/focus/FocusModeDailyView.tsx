import { FocusModeDailyViewDailyGoals } from '@/components/organisms/focus/FocusModeDailyViewDailyGoals';
import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';
import { JumpToCurrentButton } from '@/components/molecules/focus/JumpToCurrentButton';
import { FireGoalsProvider, useFireGoals } from '@/contexts/FireGoalsContext';
import { OnFireGoalsSection } from '@/components/organisms/focus/OnFireGoalsSection';
import { useCallback, useMemo, useState } from 'react';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useGoalActions } from '@/hooks/useGoalActions';

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
  const { updateQuarterlyGoalTitle, deleteQuarterlyGoal } = useGoalActions();
  const [isDailyViewHovered, setIsDailyViewHovered] = useState(false);

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
        await deleteQuarterlyGoal({
          goalId,
        });
      } catch (error) {
        console.error('Failed to delete goal:', error);
      }
    },
    [deleteQuarterlyGoal]
  );

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

        <div
          data-testid="focus-mode-daily-goals"
          className={`transition-opacity duration-300 ${
            hasFireGoals && !isDailyViewHovered
              ? 'opacity-0 hover:opacity-100'
              : 'opacity-100'
          }`}
          onMouseEnter={() => setIsDailyViewHovered(true)}
          onMouseLeave={() => setIsDailyViewHovered(false)}
          onTouchStart={() => setIsDailyViewHovered(true)}
        >
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
