import { FocusModeDailyViewDailyGoals } from '@/components/organisms/focus/FocusModeDailyViewDailyGoals';
import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';

interface FocusModeDailyViewProps {
  year: number;
  quarter: number;
  weekNumber: number;
  weekData: WeekData;
  selectedDayOfWeek: DayOfWeek;
}

export const FocusModeDailyView = ({
  year,
  quarter,
  weekNumber,
  weekData,
  selectedDayOfWeek,
}: FocusModeDailyViewProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <WeekProviderWithoutDashboard weekData={weekData}>
        <FocusModeDailyViewDailyGoals
          weekNumber={weekNumber}
          year={year}
          quarter={quarter}
          selectedDayOfWeek={selectedDayOfWeek}
        />
      </WeekProviderWithoutDashboard>
    </div>
  );
};
