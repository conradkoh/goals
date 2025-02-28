import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { WeekCardDailyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardDailyGoals';
import { WeekCardQuarterlyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardQuarterlyGoals';
import { WeekCardWeeklyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardWeeklyGoals';

interface FocusModeQuarterlyViewProps {
  year: number;
  quarter: number;
  weekData: WeekData;
}

export const FocusModeQuarterlyView = ({
  year,
  quarter,
  weekData,
}: FocusModeQuarterlyViewProps) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="font-semibold mb-4">💭 Quarterly Overview</div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          <WeekCardQuarterlyGoals
            weekNumber={1} // Start of quarter
            year={year}
            quarter={quarter}
          />
        </WeekProviderWithoutDashboard>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="font-semibold mb-4">🚀 Weekly Progress</div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          <WeekCardWeeklyGoals
            weekNumber={1} // Start of quarter
            year={year}
            quarter={quarter}
          />
        </WeekProviderWithoutDashboard>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="font-semibold mb-4">📊 Quarter Summary</div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          <WeekCardDailyGoals
            weekNumber={1} // Start of quarter
            year={year}
            quarter={quarter}
          />
        </WeekProviderWithoutDashboard>
      </div>
    </div>
  );
};
