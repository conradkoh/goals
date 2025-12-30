'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';

import { useCurrentDateInfo } from './useCurrentDateTime';
import { useQuarterWeekInfo } from './useQuarterWeekInfo';

import type { ViewMode } from '@/components/molecules/focus/constants';
import { useDeviceScreenInfo } from '@/hooks/useDeviceScreenInfo';
import { DayOfWeek } from '@/lib/constants';
import { getWeeksInYear } from '@/lib/date/iso-week';

export const useDashboard = () => {
  const val = useContext(DashboardContext);
  if (val === 'not-found') {
    throw new Error('DashboardProvider not found');
  }
  return val;
};

interface DashboardContextValue {
  // Current date values (raw from useCurrentDateInfo)
  currentDate: {
    year: number;
    weekYear: number;
    month: number;
    monthLong: string;
    day: number;
    weekdayLong: string;
    weekday: DayOfWeek;
    quarter: 1 | 2 | 3 | 4;
    weekQuarter: 1 | 2 | 3 | 4;
    weekNumber: number;
  };
  /** ISO week year for the current date (use this for week-based navigation) */
  currentYear: number;
  /** ISO week-based quarter for the current date (1-4, determined by week number) */
  currentQuarter: 1 | 2 | 3 | 4;
  currentWeekNumber: number;
  currentMonth: number;
  currentMonthName: string;
  currentDayOfMonth: number;
  currentDayName: string;

  // Selected values from URL
  selectedYear: number;
  selectedQuarter: 1 | 2 | 3 | 4;
  selectedWeek: number;
  /** The ISO week year for weekly/daily views (may differ from selectedYear at year boundaries) */
  selectedWeekYear: number;
  selectedDayOfWeek: DayOfWeek;
  viewMode: ViewMode;
  isFocusModeEnabled: boolean;

  // URL update functions
  updateUrlParams: (params: {
    week?: number;
    weekYear?: number;
    day?: DayOfWeek;
    viewMode?: ViewMode;
    year?: number;
    quarter?: number;
    focusMode?: boolean;
  }) => void;
  handleViewModeChange: (newViewMode: ViewMode) => void;
  handleYearQuarterChange: (year: number, quarter: number) => void;
  handlePrevious: () => void;
  handleNext: () => void;
  toggleFocusMode: () => void;
}

const DashboardContext = createContext<DashboardContextValue | 'not-found'>('not-found');

export const DashboardProvider = ({ children }: { children: React.ReactNode }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isMobile } = useDeviceScreenInfo();

  // Use reactive current date - already optimized to update daily
  const currentDate = useCurrentDateInfo();

  // Derive all date-related values from currentDate
  // Use ISO week year and week-based quarter for consistency across the app
  const currentYear = currentDate.weekYear; // ISO week year
  const currentQuarter = currentDate.weekQuarter; // Quarter determined by week number
  const currentMonth = currentDate.month;
  const currentMonthName = currentDate.monthLong;
  const currentDayOfMonth = currentDate.day;
  const currentDayName = currentDate.weekdayLong;

  const yearParam = searchParams.get('year');
  const quarterParam = searchParams.get('quarter');
  const weekYearParam = searchParams.get('weekYear');

  // For quarterly view, use ISO week year as the default year
  // If year param is not set but weekYear is, use weekYear as fallback for cross-view consistency
  const selectedYear = yearParam
    ? Number.parseInt(yearParam)
    : weekYearParam
      ? Number.parseInt(weekYearParam)
      : currentYear;
  const selectedQuarter = quarterParam
    ? (Number.parseInt(quarterParam) as 1 | 2 | 3 | 4)
    : currentQuarter;

  // Get quarter week info
  const { currentWeekNumber, startWeek, endWeek } = useQuarterWeekInfo(
    selectedYear,
    selectedQuarter
  );

  // Get view mode from URL or use default based on screen size
  const viewModeFromUrl = searchParams.get('viewMode') as ViewMode | null;
  const viewMode = viewModeFromUrl || (isMobile ? 'daily' : 'quarterly');

  // Get selected week year (ISO week year, used for weekly/daily views)
  // This defaults to the current ISO week year which may differ from calendar year at year boundaries
  // If weekYear param is not set but year is, use year as fallback for cross-view consistency
  const selectedWeekYear = weekYearParam
    ? Number.parseInt(weekYearParam)
    : yearParam
      ? Number.parseInt(yearParam)
      : currentDate.weekYear;

  // Get selected week from URL or use current week
  const weekFromUrl = searchParams.get('week');
  const selectedWeek = weekFromUrl ? Number.parseInt(weekFromUrl) : currentWeekNumber;

  // Get day from URL or use current day
  const dayFromUrl = searchParams.get('day');
  const selectedDayOfWeek = dayFromUrl
    ? (Number.parseInt(dayFromUrl) as DayOfWeek)
    : (currentDate.weekday as DayOfWeek);

  // Calculate navigation bounds for quarterly view
  // For weekly/daily views, we don't limit bounds - users can navigate freely across years
  const isAtMinBound =
    viewMode === 'quarterly'
      ? selectedWeek === startWeek
      : viewMode === 'daily'
        ? false // No bounds in daily view - can navigate freely
        : false; // No bounds in weekly view - can navigate freely
  const isAtMaxBound =
    viewMode === 'quarterly'
      ? selectedWeek === endWeek
      : viewMode === 'daily'
        ? false // No bounds in daily view - can navigate freely
        : false; // No bounds in weekly view - can navigate freely

  // Update URL helper function
  const updateUrlParams = useCallback(
    (params: {
      week?: number;
      weekYear?: number;
      day?: DayOfWeek;
      viewMode?: ViewMode;
      year?: number;
      quarter?: number;
      focusMode?: boolean;
    }) => {
      const newParams = new URLSearchParams(searchParams.toString());

      if (params.week !== undefined) {
        newParams.set('week', params.week.toString());
      }

      if (params.weekYear !== undefined) {
        newParams.set('weekYear', params.weekYear.toString());
      }

      if (params.day !== undefined) {
        newParams.set('day', params.day.toString());
      }

      if (params.viewMode !== undefined) {
        newParams.set('viewMode', params.viewMode);
      }

      if (params.year !== undefined) {
        newParams.set('year', params.year.toString());
      }

      if (params.quarter !== undefined) {
        newParams.set('quarter', params.quarter.toString());
      }

      if (params.focusMode !== undefined) {
        newParams.set('focusMode', params.focusMode.toString());
      }

      router.push(`/app?${newParams.toString()}`);
    },
    [router, searchParams]
  );

  // Handle view mode changes
  const handleViewModeChange = useCallback(
    (newViewMode: ViewMode) => {
      // Update URL with new view mode
      const params: {
        viewMode: ViewMode;
        week?: number;
        weekYear?: number;
        day?: DayOfWeek;
        year?: number;
        quarter?: number;
      } = {
        viewMode: newViewMode,
      };

      // If changing to weekly or daily view, ensure week and weekYear parameters are set
      if (newViewMode === 'weekly' || newViewMode === 'daily') {
        if (!searchParams.has('week')) {
          params.week = currentWeekNumber;
        }
        if (!searchParams.has('weekYear')) {
          // If weekYear not set, use year param if available, otherwise current week year
          params.weekYear = selectedYear || currentDate.weekYear;
        }
      }

      // If changing to daily view, ensure day parameter is set
      if (newViewMode === 'daily' && !searchParams.has('day')) {
        params.day = currentDate.weekday as DayOfWeek;
      }

      // If changing to quarterly view, ensure year and quarter parameters are set
      if (newViewMode === 'quarterly') {
        if (!searchParams.has('year')) {
          // If year not set, use weekYear param if available, otherwise current year
          params.year = selectedWeekYear || currentYear;
        }
        if (!searchParams.has('quarter')) {
          params.quarter = currentQuarter;
        }
      }

      updateUrlParams(params);
    },
    [
      updateUrlParams,
      searchParams,
      currentWeekNumber,
      currentDate.weekday,
      currentDate.weekYear,
      selectedYear,
      selectedWeekYear,
      currentYear,
      currentQuarter,
    ]
  );

  // Handle year and quarter changes
  const handleYearQuarterChange = useCallback(
    (year: number, quarter: number) => {
      updateUrlParams({ year, quarter });
    },
    [updateUrlParams]
  );

  // Handle previous navigation
  const handlePrevious = useCallback(() => {
    if (isAtMinBound) return;

    if (viewMode === 'quarterly') {
      // Navigate to previous quarter
      if (selectedQuarter === 1) {
        updateUrlParams({ year: selectedYear - 1, quarter: 4 });
      } else {
        updateUrlParams({ quarter: selectedQuarter - 1 });
      }
      return;
    }

    if (viewMode === 'weekly') {
      // Check if we need to go to previous year
      if (selectedWeek === 1) {
        const prevYear = selectedWeekYear - 1;
        const weeksInPrevYear = getWeeksInYear(prevYear);
        updateUrlParams({ week: weeksInPrevYear, weekYear: prevYear });
      } else {
        updateUrlParams({ week: selectedWeek - 1 });
      }
      return;
    }

    if (viewMode === 'daily') {
      if (selectedDayOfWeek === DayOfWeek.MONDAY) {
        // If we're on Monday, go to previous week's Sunday
        if (selectedWeek === 1) {
          const prevYear = selectedWeekYear - 1;
          const weeksInPrevYear = getWeeksInYear(prevYear);
          updateUrlParams({
            week: weeksInPrevYear,
            weekYear: prevYear,
            day: DayOfWeek.SUNDAY,
          });
        } else {
          updateUrlParams({
            week: selectedWeek - 1,
            day: DayOfWeek.SUNDAY,
          });
        }
      } else {
        // Otherwise just go to previous day
        updateUrlParams({
          day: (selectedDayOfWeek - 1) as DayOfWeek,
        });
      }
    }
  }, [
    isAtMinBound,
    viewMode,
    selectedYear,
    selectedQuarter,
    selectedWeek,
    selectedWeekYear,
    selectedDayOfWeek,
    updateUrlParams,
  ]);

  // Handle next navigation
  const handleNext = useCallback(() => {
    if (isAtMaxBound) return;

    const weeksInCurrentYear = getWeeksInYear(selectedWeekYear);

    if (viewMode === 'quarterly') {
      // Navigate to next quarter
      if (selectedQuarter === 4) {
        updateUrlParams({ year: selectedYear + 1, quarter: 1 });
      } else {
        updateUrlParams({ quarter: selectedQuarter + 1 });
      }
      return;
    }

    if (viewMode === 'weekly') {
      // Check if we need to go to next year
      if (selectedWeek >= weeksInCurrentYear) {
        updateUrlParams({ week: 1, weekYear: selectedWeekYear + 1 });
      } else {
        updateUrlParams({ week: selectedWeek + 1 });
      }
      return;
    }

    if (viewMode === 'daily') {
      if (selectedDayOfWeek === DayOfWeek.SUNDAY) {
        // If we're on Sunday, go to next week's Monday
        if (selectedWeek >= weeksInCurrentYear) {
          updateUrlParams({
            week: 1,
            weekYear: selectedWeekYear + 1,
            day: DayOfWeek.MONDAY,
          });
        } else {
          updateUrlParams({
            week: selectedWeek + 1,
            day: DayOfWeek.MONDAY,
          });
        }
      } else {
        // Otherwise just go to next day
        updateUrlParams({
          day: (selectedDayOfWeek + 1) as DayOfWeek,
        });
      }
    }
  }, [
    isAtMaxBound,
    viewMode,
    selectedYear,
    selectedQuarter,
    selectedWeek,
    selectedWeekYear,
    selectedDayOfWeek,
    updateUrlParams,
  ]);

  // Handle toggle focus mode
  const toggleFocusMode = useCallback(() => {
    updateUrlParams({ focusMode: !(searchParams.get('focusMode') === 'true') });
  }, [updateUrlParams, searchParams]);

  const value = useMemo(
    () => ({
      // Current date values
      currentDate: currentDate,
      currentYear,
      currentQuarter,
      currentWeekNumber,
      currentMonth,
      currentMonthName,
      currentDayOfMonth,
      currentDayName,

      // Selected values from URL
      selectedYear,
      selectedQuarter,
      selectedWeek,
      selectedWeekYear,
      selectedDayOfWeek,
      viewMode,
      isFocusModeEnabled: searchParams.get('focusMode') === 'true',

      // URL update functions
      updateUrlParams,
      handleViewModeChange,
      handleYearQuarterChange,
      handlePrevious,
      handleNext,
      toggleFocusMode,
    }),
    [
      currentDate,
      currentYear,
      currentQuarter,
      currentWeekNumber,
      currentMonth,
      currentMonthName,
      currentDayOfMonth,
      currentDayName,
      selectedYear,
      selectedQuarter,
      selectedWeek,
      selectedWeekYear,
      selectedDayOfWeek,
      viewMode,
      searchParams,
      updateUrlParams,
      handleViewModeChange,
      handleYearQuarterChange,
      handlePrevious,
      handleNext,
      toggleFocusMode,
    ]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};
