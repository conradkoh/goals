'use client';
import {
  useWeekWithoutDashboard,
  WeekProviderWithoutDashboard,
} from '@/hooks/useWeek';
import { WeekCardDailyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardDailyGoals';
import { WeekCardQuarterlyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardQuarterlyGoals';
import { WeekCardWeeklyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardWeeklyGoals';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuarterWeekInfo } from '@/hooks/useQuarterWeekInfo';
import { cn } from '@/lib/utils';
import { DateTime } from 'luxon';
import { ViewMode } from '@/app/focus/page.constants';
import { DayOfWeek } from '@/lib/constants';
import { JumpToCurrentButton } from '@/app/focus/components/JumpToCurrent';
export const FocusPage = () => {
  const year = 2025;
  const quarter = 1;
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedWeek, setSelectedWeek] = useState(8);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const today = DateTime.now();
    return today.weekday as DayOfWeek;
  });

  const { weeks, startWeek, endWeek, currentWeekNumber, isCurrentQuarter } =
    useQuarterWeekInfo(year, quarter);
  const weekDetails = useWeekWithoutDashboard({
    year,
    quarter,
    week: selectedWeek,
  });

  // Find the current week's data
  const currentWeekInfo = weeks.find((w) => w.weekNumber === selectedWeek);

  // Calculate navigation bounds
  const isAtMinBound =
    viewMode === 'daily'
      ? selectedWeek === startWeek && selectedDay === DayOfWeek.MONDAY
      : selectedWeek === startWeek;
  const isAtMaxBound =
    viewMode === 'daily'
      ? selectedWeek === endWeek && selectedDay === DayOfWeek.SUNDAY
      : selectedWeek === endWeek;

  const handlePrevious = () => {
    if (isAtMinBound) return;

    if (viewMode === 'weekly') {
      setSelectedWeek(selectedWeek - 1);
      return;
    }

    if (selectedDay === DayOfWeek.MONDAY) {
      // If we're on Monday and not at min week, go to previous week's Sunday
      setSelectedWeek(selectedWeek - 1);
      setSelectedDay(DayOfWeek.SUNDAY);
    } else {
      // Otherwise just go to previous day
      setSelectedDay((selectedDay - 1) as DayOfWeek);
    }
  };

  const handleNext = () => {
    if (isAtMaxBound) return;

    if (viewMode === 'weekly') {
      setSelectedWeek(selectedWeek + 1);
      return;
    }

    if (selectedDay === DayOfWeek.SUNDAY) {
      // If we're on Sunday and not at max week, go to next week's Monday
      setSelectedWeek(selectedWeek + 1);
      setSelectedDay(DayOfWeek.MONDAY);
    } else {
      // Otherwise just go to next day
      setSelectedDay((selectedDay + 1) as DayOfWeek);
    }
  };

  const handleJumpToCurrent = () => {
    const today = DateTime.now();
    if (viewMode === 'daily') {
      setSelectedWeek(currentWeekNumber);
      setSelectedDay(today.weekday as DayOfWeek);
    } else {
      setSelectedWeek(currentWeekNumber);
    }
  };

  if (!weekDetails || !currentWeekInfo) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Focus Mode</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={isAtMinBound}
                  className={cn(
                    'h-8 w-8 text-muted-foreground hover:text-foreground',
                    isAtMinBound && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[140px] text-center">
                  {viewMode === 'daily'
                    ? `${getDayName(selectedDay)} [Week ${selectedWeek}]`
                    : `Week ${selectedWeek}`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  disabled={isAtMaxBound}
                  className={cn(
                    'h-8 w-8 text-muted-foreground hover:text-foreground',
                    isAtMaxBound && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Select
                value={viewMode}
                onValueChange={(value: ViewMode) => setViewMode(value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily View</SelectItem>
                  <SelectItem value="weekly">Weekly View</SelectItem>
                </SelectContent>
              </Select>
              <JumpToCurrentButton
                viewMode={viewMode}
                selectedWeek={selectedWeek}
                selectedDay={selectedDay}
                currentWeekNumber={currentWeekNumber}
                isCurrentQuarter={isCurrentQuarter}
                onJumpToCurrent={handleJumpToCurrent}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard')}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-8 space-y-6">
        {/* Weekly View */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="font-semibold mb-4">💭 Quarterly Goals</div>
            <WeekProviderWithoutDashboard weekData={weekDetails}>
              <WeekCardQuarterlyGoals
                weekNumber={selectedWeek}
                year={year}
                quarter={quarter}
              />
            </WeekProviderWithoutDashboard>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="font-semibold mb-4">🚀 Weekly Goals</div>
            <WeekProviderWithoutDashboard weekData={weekDetails}>
              <WeekCardWeeklyGoals
                weekNumber={selectedWeek}
                year={year}
                quarter={quarter}
              />
            </WeekProviderWithoutDashboard>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="font-semibold mb-4">🔍 Daily Goals</div>
            <WeekProviderWithoutDashboard weekData={weekDetails}>
              <WeekCardDailyGoals
                weekNumber={selectedWeek}
                year={year}
                quarter={quarter}
                showOnlyToday={viewMode === 'daily'}
                selectedDayOverride={
                  viewMode === 'daily' ? selectedDay : undefined
                }
              />
            </WeekProviderWithoutDashboard>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get day name
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

export default FocusPage;
