import { WeekProvider } from '@/hooks/useWeek';
import { WeekCardDailyGoals } from './WeekCardDailyGoals';

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
  weekNumber: number;
  selectedDayOfWeek: DayOfWeek;
  onNavigate: (weekNumber: number, dayOfWeek: DayOfWeek) => void;
}

export const FocusModeDailyView = ({
  weekNumber,
  selectedDayOfWeek,
  onNavigate,
}: FocusModeDailyViewProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <WeekProvider weekNumber={weekNumber}>
        <WeekCardDailyGoals
          weekNumber={weekNumber}
          showOnlyToday={true}
          selectedDayOverride={selectedDayOfWeek}
        />
      </WeekProvider>
    </div>
  );
};
