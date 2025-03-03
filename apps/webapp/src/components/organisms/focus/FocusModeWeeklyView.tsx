import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { WeekCardDailyGoals } from '../goals-new/week-card-sections/WeekCardDailyGoals';
import { WeekCardQuarterlyGoals } from '../goals-new/week-card-sections/WeekCardQuarterlyGoals';
import { WeekCardWeeklyGoals } from '../goals-new/week-card-sections/WeekCardWeeklyGoals';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { useMoveGoalsForWeek } from '@/hooks/useMoveGoalsForWeek';
import { useMemo } from 'react';

interface FocusModeWeeklyViewProps {
  weekNumber: number;
  year: number;
  quarter: number;
  weekData: WeekData;
}

export const FocusModeWeeklyView = ({
  weekNumber,
  year,
  quarter,
  weekData,
}: FocusModeWeeklyViewProps) => {
  const { isFirstWeek, isMovingTasks, handlePreviewTasks, dialog } =
    useMoveGoalsForWeek({
      weekNumber,
      year,
      quarter,
    });

  // Memoize this value to prevent unnecessary re-renders
  const isDisabled = useMemo(
    () => isFirstWeek || isMovingTasks,
    [isFirstWeek, isMovingTasks]
  );

  // Memoize the components to prevent unnecessary re-renders
  const quarterlyGoalsComponent = useMemo(
    () => (
      <WeekCardQuarterlyGoals
        weekNumber={weekNumber}
        year={year}
        quarter={quarter}
      />
    ),
    [weekNumber, year, quarter]
  );

  const weeklyGoalsComponent = useMemo(
    () => (
      <WeekCardWeeklyGoals
        weekNumber={weekNumber}
        year={year}
        quarter={quarter}
      />
    ),
    [weekNumber, year, quarter]
  );

  const dailyGoalsComponent = useMemo(
    () => (
      <WeekCardDailyGoals
        weekNumber={weekNumber}
        year={year}
        quarter={quarter}
        mode="plan"
      />
    ),
    [weekNumber, year, quarter]
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="font-semibold">💭 Quarterly Goals</div>
          {!isFirstWeek && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviewTasks}
              disabled={isDisabled}
              className="text-muted-foreground hover:text-foreground"
            >
              <History className="h-4 w-4 mr-2" />
              Pull from Previous Week
            </Button>
          )}
        </div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          {quarterlyGoalsComponent}
        </WeekProviderWithoutDashboard>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="font-semibold mb-4">🚀 Weekly Goals</div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          {weeklyGoalsComponent}
        </WeekProviderWithoutDashboard>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="font-semibold mb-4">🔍 Daily Goals</div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          {dailyGoalsComponent}
        </WeekProviderWithoutDashboard>
      </div>

      {dialog}
    </div>
  );
};
