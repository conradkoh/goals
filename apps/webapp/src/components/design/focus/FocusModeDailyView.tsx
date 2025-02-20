import { WeekCardDailyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardDailyGoals';
import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';

interface FocusModeDailyViewProps {
  year: number;
  quarter: number;
  weekNumber: number;
  weekData: WeekData;
  selectedDayOfWeek: DayOfWeek;
  onNavigate: (weekNumber: number, dayOfWeek: DayOfWeek) => void;
}

export const FocusModeDailyView = ({
  year,
  quarter,
  weekNumber,
  weekData,
  selectedDayOfWeek,
  onNavigate,
}: FocusModeDailyViewProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <WeekProviderWithoutDashboard weekData={weekData}>
        <WeekCardDailyGoals
          weekNumber={weekNumber}
          year={year}
          quarter={quarter}
          showOnlyToday={true}
          selectedDayOverride={selectedDayOfWeek}
        />
      </WeekProviderWithoutDashboard>
    </div>
  );
};
