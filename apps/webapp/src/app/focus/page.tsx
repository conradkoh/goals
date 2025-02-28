'use client';
import { useState, useEffect } from 'react';
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
import { useCurrentDateTime } from '@/hooks/useCurrentDateTime';
import { FocusHeader } from './components/FocusHeader';

const FocusPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const year = parseInt(searchParams.get('year') ?? '2025');
  const quarter = parseInt(searchParams.get('quarter') ?? '1') as 1 | 2 | 3 | 4;
  const initialWeek = parseInt(searchParams.get('week') ?? '8');
  const viewParam = searchParams.get('view') ?? 'daily';
  const currentDateTime = useCurrentDateTime();

  // Ensure viewParam is a valid ViewMode
  const initialViewMode = (
    viewParam === 'weekly'
      ? 'weekly'
      : viewParam === 'quarterly'
      ? 'quarterly'
      : 'daily'
  ) as ViewMode;

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [selectedWeek, setSelectedWeek] = useState(initialWeek);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    return currentDateTime.weekday as DayOfWeek;
  });

  // Redirect to quarterly focus page if quarterly view is selected
  useEffect(() => {
    if (viewMode === 'quarterly') {
      router.push(`/focus/quarterly?year=${year}&quarter=${quarter}`);
    }
  }, [viewMode, year, quarter, router]);

  // Update URL when parameters change
  const updateUrl = (params: {
    week?: number;
    view?: ViewMode;
    day?: DayOfWeek;
  }) => {
    const newParams = new URLSearchParams(searchParams.toString());

    if (params.week !== undefined) {
      newParams.set('week', params.week.toString());
    }

    if (params.view !== undefined) {
      newParams.set('view', params.view);
    }

    if (params.day !== undefined) {
      newParams.set('day', params.day.toString());
    }

    router.push(`/focus?${newParams.toString()}`);
  };

  // Update viewMode when URL changes
  useEffect(() => {
    if (viewParam === 'weekly' || viewParam === 'daily') {
      setViewMode(viewParam);
    }
  }, [viewParam]);

  // Update selectedWeek when URL changes
  useEffect(() => {
    setSelectedWeek(initialWeek);
  }, [initialWeek]);

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
      const newWeek = selectedWeek - 1;
      setSelectedWeek(newWeek);
      updateUrl({ week: newWeek });
      return;
    }

    if (selectedDay === DayOfWeek.MONDAY) {
      // If we're on Monday and not at min week, go to previous week's Sunday
      const newWeek = selectedWeek - 1;
      setSelectedWeek(newWeek);
      setSelectedDay(DayOfWeek.SUNDAY);
      updateUrl({ week: newWeek, day: DayOfWeek.SUNDAY });
    } else {
      // Otherwise just go to previous day
      const newDay = (selectedDay - 1) as DayOfWeek;
      setSelectedDay(newDay);
      updateUrl({ day: newDay });
    }
  };

  const handleNext = () => {
    if (isAtMaxBound) return;

    if (viewMode === 'weekly') {
      const newWeek = selectedWeek + 1;
      setSelectedWeek(newWeek);
      updateUrl({ week: newWeek });
      return;
    }

    if (selectedDay === DayOfWeek.SUNDAY) {
      // If we're on Sunday and not at max week, go to next week's Monday
      const newWeek = selectedWeek + 1;
      setSelectedWeek(newWeek);
      setSelectedDay(DayOfWeek.MONDAY);
      updateUrl({ week: newWeek, day: DayOfWeek.MONDAY });
    } else {
      // Otherwise just go to next day
      const newDay = (selectedDay + 1) as DayOfWeek;
      setSelectedDay(newDay);
      updateUrl({ day: newDay });
    }
  };

  const handleJumpToCurrent = () => {
    if (viewMode === 'daily') {
      const currentDay = currentDateTime.weekday as DayOfWeek;
      setSelectedWeek(currentWeekNumber);
      setSelectedDay(currentDay);
      updateUrl({ week: currentWeekNumber, day: currentDay });
    } else {
      setSelectedWeek(currentWeekNumber);
      updateUrl({ week: currentWeekNumber });
    }
  };

  const handleClose = () => {
    router.push(`/dashboard?year=${year}&quarter=${quarter}`);
  };

  const handleNavigateToDay = (weekNumber: number, dayOfWeek: DayOfWeek) => {
    setSelectedWeek(weekNumber);
    setSelectedDay(dayOfWeek);
    updateUrl({ week: weekNumber, day: dayOfWeek });
  };

  const handleNavigateToWeek = (weekNumber: number) => {
    setSelectedWeek(weekNumber);
    updateUrl({ week: weekNumber });
  };

  const handleViewModeChange = (newViewMode: ViewMode) => {
    setViewMode(newViewMode);

    // If quarterly view is selected, we'll redirect in the useEffect
    // Otherwise, update the URL as usual
    if (newViewMode !== 'quarterly') {
      updateUrl({ view: newViewMode });
    }
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
    <div className="min-h-screen w-screen bg-gray-50 overflow-clip">
      {/* Top Bar */}
      <FocusHeader
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onClose={handleClose}
      >
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
        <JumpToCurrentButton
          viewMode={viewMode}
          selectedWeek={selectedWeek}
          selectedDay={selectedDay}
          currentWeekNumber={currentWeekNumber}
          isCurrentQuarter={isCurrentQuarter}
          onJumpToCurrent={handleJumpToCurrent}
        />
      </FocusHeader>

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
