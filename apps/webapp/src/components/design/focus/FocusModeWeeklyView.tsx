import { WeekProvider } from '@/hooks/useWeek';
import { WeekCardDailyGoals } from '../quarterly-overview/week-card-sections/WeekCardDailyGoals';
import { WeekCardQuarterlyGoals } from '../quarterly-overview/week-card-sections/WeekCardQuarterlyGoals';
import { WeekCardWeeklyGoals } from '../quarterly-overview/week-card-sections/WeekCardWeeklyGoals';
import { useDashboard } from '@/hooks/useDashboard';

interface FocusModeWeeklyViewProps {
  weekNumber: number;
  onNavigate: (weekNumber: number) => void;
}

export const FocusModeWeeklyView = ({
  weekNumber,
  onNavigate,
}: FocusModeWeeklyViewProps) => {
  const { selectedQuarter, selectedYear } = useDashboard();
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="font-semibold mb-4">💭 Quarterly Goals</div>
        <WeekProvider weekNumber={weekNumber}>
          <WeekCardQuarterlyGoals
            weekNumber={weekNumber}
            year={selectedYear}
            quarter={selectedQuarter}
          />
        </WeekProvider>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="font-semibold mb-4">🚀 Weekly Goals</div>
        <WeekProvider weekNumber={weekNumber}>
          <WeekCardWeeklyGoals
            weekNumber={weekNumber}
            year={selectedYear}
            quarter={selectedQuarter}
          />
        </WeekProvider>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="font-semibold mb-4">🔍 Daily Goals</div>
        <WeekProvider weekNumber={weekNumber}>
          <WeekCardDailyGoals
            weekNumber={weekNumber}
            year={selectedYear}
            quarter={selectedQuarter}
          />
        </WeekProvider>
      </div>
    </div>
  );
};
