'use client';
import { JumpToCurrentButton } from '@/components/molecules/focus/JumpToCurrentButton';
import { ViewMode } from '@/app/focus/page.constants';
import { FocusModeDailyView } from '@/components/organisms/focus/FocusModeDailyView';
import { FocusModeWeeklyView } from '@/components/organisms/focus/FocusModeWeeklyView';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentDateTime } from '@/hooks/useCurrentDateTime';
import { useQuarterWeekInfo } from '@/hooks/useQuarterWeekInfo';
import { useWeekWithoutDashboard } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FocusHeader } from './components/FocusHeader';

const FocusPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const year = parseInt(searchParams.get('year') ?? '2025');
  const quarter = parseInt(searchParams.get('quarter') ?? '1') as 1 | 2 | 3 | 4;
  const initialWeek = parseInt(searchParams.get('week') ?? '8');
  const viewParam = searchParams.get('view') ?? 'daily';
  const dayParam = searchParams.get('day');
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
    // If there's a day in the URL, use that
    if (dayParam) {
      const day = parseInt(dayParam);
      // Validate the day is within range
      if (day >= DayOfWeek.MONDAY && day <= DayOfWeek.SUNDAY) {
        return day as DayOfWeek;
      }
    }
    // Otherwise use current day
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

  // Sync URL with selectedDay when switching to daily view
  useEffect(() => {
    if (viewMode === 'daily' && !dayParam) {
      updateUrl({ day: selectedDay });
    }
  }, [viewMode, dayParam, selectedDay]);

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

  // Type-safe wrappers for the handleJumpToCurrent function
  const handleJumpToCurrentDay = (weekNumber: number, dayOfWeek: DayOfWeek) => {
    setSelectedWeek(weekNumber);
    setSelectedDay(dayOfWeek);
    updateUrl({ week: weekNumber, day: dayOfWeek });
  };

  const handleJumpToCurrentWeek = (weekNumber: number) => {
    setSelectedWeek(weekNumber);
    updateUrl({ week: weekNumber });
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
      <div className="bg-white rounded-lg shadow-sm p-4">
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
      <div className="max-w-screen-2xl mx-auto px-4 flex justify-center">
        {/* Top Bar */}
        <FocusHeader
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onClose={handleClose}
          selectedWeek={selectedWeek}
          selectedDay={selectedDay}
          isAtMinBound={isAtMinBound}
          isAtMaxBound={isAtMaxBound}
          onPrevious={handlePrevious}
          onNext={handleNext}
          selectedYear={year}
          selectedQuarter={quarter}
        >
          {viewMode !== 'quarterly' && (
            <JumpToCurrentButton
              viewMode={viewMode === 'daily' ? 'daily' : 'weekly'}
              year={year}
              quarter={quarter}
              selectedWeek={selectedWeek}
              selectedDay={selectedDay}
              onJumpToCurrentDay={handleJumpToCurrentDay}
              onJumpToCurrentWeek={handleJumpToCurrentWeek}
            />
          )}
        </FocusHeader>
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
              onJumpToCurrent={handleJumpToCurrentDay}
            />
          ) : (
            <FocusModeWeeklyView
              weekNumber={selectedWeek}
              year={year}
              quarter={quarter}
              weekData={weekDetails}
              onJumpToCurrent={handleJumpToCurrentWeek}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FocusPage;
