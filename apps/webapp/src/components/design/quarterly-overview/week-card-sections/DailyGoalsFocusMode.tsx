import { Button } from '@/components/ui/button';
import { KeyboardShortcut } from '@/components/ui/keyboard-shortcut';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { WeekCardDailyGoals } from './WeekCardDailyGoals';
import { useState } from 'react';
import { DateTime } from 'luxon';
import { cn } from '@/lib/utils';
import { WeekProvider } from '@/hooks/useWeek';
import { useDashboard } from '@/hooks/useDashboard';

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

const getDayName = (dayOfWeek: number): string => {
  const names = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  return names[dayOfWeek - 1];
};

interface DailyGoalsFocusModeProps {
  weekNumber: number;
  onClose: () => void;
}

export const DailyGoalsFocusMode = ({
  weekNumber: initialWeekNumber,
  onClose,
}: DailyGoalsFocusModeProps) => {
  const { weekData } = useDashboard();
  const [weekNumber, setWeekNumber] = useState(initialWeekNumber);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const today = DateTime.now();
    return today.weekday as DayOfWeek;
  });

  // Get the min and max week numbers from the quarter's week data
  const minWeek = weekData[0]?.weekNumber ?? initialWeekNumber;
  const maxWeek =
    weekData[weekData.length - 1]?.weekNumber ?? initialWeekNumber;

  const isAtMinBound =
    weekNumber === minWeek && selectedDay === DayOfWeek.MONDAY;
  const isAtMaxBound =
    weekNumber === maxWeek && selectedDay === DayOfWeek.SUNDAY;

  const handlePreviousDay = () => {
    if (isAtMinBound) return;

    if (selectedDay === DayOfWeek.MONDAY) {
      // If we're on Monday and not at min week, go to previous week's Sunday
      setWeekNumber(weekNumber - 1);
      setSelectedDay(DayOfWeek.SUNDAY);
    } else {
      // Otherwise just go to previous day
      setSelectedDay((selectedDay - 1) as DayOfWeek);
    }
  };

  const handleNextDay = () => {
    if (isAtMaxBound) return;

    if (selectedDay === DayOfWeek.SUNDAY) {
      // If we're on Sunday and not at max week, go to next week's Monday
      setWeekNumber(weekNumber + 1);
      setSelectedDay(DayOfWeek.MONDAY);
    } else {
      // Otherwise just go to next day
      setSelectedDay((selectedDay + 1) as DayOfWeek);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-auto">
      <KeyboardShortcut onEscPressed={onClose} />
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Focus Mode</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousDay}
                  disabled={isAtMinBound}
                  className={cn(
                    'h-8 w-8 text-muted-foreground hover:text-foreground',
                    isAtMinBound && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[140px] text-center">
                  {getDayName(selectedDay)} [Week {weekNumber}]
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextDay}
                  disabled={isAtMaxBound}
                  className={cn(
                    'h-8 w-8 text-muted-foreground hover:text-foreground',
                    isAtMaxBound && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <WeekProvider weekNumber={weekNumber}>
                <WeekCardDailyGoals
                  weekNumber={weekNumber}
                  showOnlyToday={true}
                  selectedDayOverride={selectedDay}
                />
              </WeekProvider>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
