import { FocusModeDailyViewDailyGoals } from '@/components/organisms/focus/FocusModeDailyViewDailyGoals';
import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';
import { JumpToCurrentButton } from '@/components/molecules/focus/JumpToCurrentButton';

interface FocusModeDailyViewProps {
  year: number;
  quarter: number;
  weekNumber: number;
  weekData: WeekData;
  selectedDayOfWeek: DayOfWeek;
  onJumpToCurrent: (weekNumber: number, dayOfWeek: DayOfWeek) => void;
}

export const FocusModeDailyView = ({
  year,
  quarter,
  weekNumber,
  weekData,
  selectedDayOfWeek,
  onJumpToCurrent,
}: FocusModeDailyViewProps) => {
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
