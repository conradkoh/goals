'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { DayOfWeek, getDayName } from '@/lib/constants';
import { JumpToCurrentButton } from '@/app/focus/components/JumpToCurrent';
import { Skeleton } from '@/components/ui/skeleton';
import { FocusModeDailyView } from '@/components/design/focus/FocusModeDailyView';
import { FocusModeWeeklyView } from '@/components/design/focus/FocusModeWeeklyView';
import { useWeekWithoutDashboard } from '@/hooks/useWeek';

const FocusPage = () => {
  const searchParams = useSearchParams();
  const year = parseInt(searchParams.get('year') ?? '2025');
  const quarter = parseInt(searchParams.get('quarter') ?? '1') as 1 | 2 | 3 | 4;
  const initialWeek = parseInt(searchParams.get('week') ?? '8');

  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedWeek, setSelectedWeek] = useState(initialWeek);
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

  const handleClose = () => {
    router.push(`/dashboard?year=${year}&quarter=${quarter}`);
  };

  const handleNavigateToDay = (weekNumber: number, dayOfWeek: DayOfWeek) => {
    setSelectedWeek(weekNumber);
    setSelectedDay(dayOfWeek);
  };

  const handleNavigateToWeek = (weekNumber: number) => {
    setSelectedWeek(weekNumber);
  };

  const renderLoadingSkeleton = () => (
    <div className="container mx-auto py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-6">
          {/* Day Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-32" /> {/* Day name */}
            </div>
          </div>

          {/* Tasks Section */}
          <div className="space-y-6">
            {/* Morning Section */}
            <div className="space-y-3">
              <Skeleton className="h-6 w-24" /> {/* Section title */}
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-5/6" />
                <Skeleton className="h-10 w-4/5" />
              </div>
            </div>

            {/* Afternoon Section */}
            <div className="space-y-3">
              <Skeleton className="h-6 w-24" /> {/* Section title */}
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-5/6" />
              </div>
            </div>

            {/* Evening Section */}
            <div className="space-y-3">
              <Skeleton className="h-6 w-24" /> {/* Section title */}
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-4/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
              onClick={handleClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {!weekDetails || !currentWeekInfo ? (
        renderLoadingSkeleton()
      ) : (
        <div className="container mx-auto py-8">
          {viewMode === 'daily' ? (
            <FocusModeDailyView
              weekNumber={selectedWeek}
              year={year}
              quarter={quarter}
              weekData={weekDetails}
              selectedDayOfWeek={selectedDay}
              onNavigate={handleNavigateToDay}
            />
          ) : (
            <FocusModeWeeklyView
              weekNumber={selectedWeek}
              year={year}
              quarter={quarter}
              weekData={weekDetails}
              onNavigate={handleNavigateToWeek}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FocusPage;
