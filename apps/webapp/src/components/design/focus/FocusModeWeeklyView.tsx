import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { WeekCardDailyGoals } from '../quarterly-overview/week-card-sections/WeekCardDailyGoals';
import { WeekCardQuarterlyGoals } from '../quarterly-overview/week-card-sections/WeekCardQuarterlyGoals';
import { WeekCardWeeklyGoals } from '../quarterly-overview/week-card-sections/WeekCardWeeklyGoals';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { useMoveGoalsForWeek } from '@/hooks/useMoveGoalsForWeek';

interface FocusModeWeeklyViewProps {
  weekNumber: number;
  year: number;
  quarter: number;
  weekData: WeekData;
  onNavigate: (weekNumber: number) => void;
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

  const isDisabled = isFirstWeek || isMovingTasks;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
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
          <WeekCardQuarterlyGoals
            weekNumber={weekNumber}
            year={year}
            quarter={quarter}
          />
        </WeekProviderWithoutDashboard>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="font-semibold mb-4">🚀 Weekly Goals</div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          <WeekCardWeeklyGoals
            weekNumber={weekNumber}
            year={year}
            quarter={quarter}
          />
        </WeekProviderWithoutDashboard>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="font-semibold mb-4">🔍 Daily Goals</div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          <WeekCardDailyGoals
            weekNumber={weekNumber}
            year={year}
            quarter={quarter}
            mode="plan"
          />
        </WeekProviderWithoutDashboard>
      </div>

      {dialog}
    </div>
  );
};
