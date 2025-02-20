import { WeekCardDailyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardDailyGoals';
import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';

// Day of week constants
const DayOfWeek = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
} as const;

type DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];

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
