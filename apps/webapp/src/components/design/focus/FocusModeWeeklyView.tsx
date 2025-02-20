import { WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { WeekCardDailyGoals } from '../quarterly-overview/week-card-sections/WeekCardDailyGoals';
import { WeekCardQuarterlyGoals } from '../quarterly-overview/week-card-sections/WeekCardQuarterlyGoals';
import { WeekCardWeeklyGoals } from '../quarterly-overview/week-card-sections/WeekCardWeeklyGoals';

interface FocusModeWeeklyViewProps {
  weekNumber: number;
  year: number;
  quarter: number;
  weekData: any; // TODO: Add proper type
  onNavigate: (weekNumber: number) => void;
}

export const FocusModeWeeklyView = ({
  weekNumber,
  year,
  quarter,
  weekData,
  onNavigate,
}: FocusModeWeeklyViewProps) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="font-semibold mb-4">💭 Quarterly Goals</div>
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
          />
        </WeekProviderWithoutDashboard>
      </div>
    </div>
  );
};
