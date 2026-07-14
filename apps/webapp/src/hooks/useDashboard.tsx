'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';

import { useCurrentDateInfo } from './useCurrentDateTime';
import { useQuarterWeekInfo } from './useQuarterWeekInfo';

import type { ViewMode } from '@/components/molecules/focus/constants';
import { useDeviceScreenInfo } from '@/hooks/useDeviceScreenInfo';
import { DayOfWeek } from '@/lib/constants';
import {
  buildDashboardHref,
  buildDashboardViewHref,
  getViewModeFromPathname,
  type DashboardUrlUpdates,
} from '@/lib/dashboard/dashboardUrlParams';
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

  // Selected values from URL (year is always ISO week year)
  selectedYear: number;
  selectedQuarter: 1 | 2 | 3 | 4;
  selectedWeek: number;
  selectedDayOfWeek: DayOfWeek;
  viewMode: ViewMode;
  isFocusModeEnabled: boolean;

  // URL update functions
  updateUrlParams: (params: DashboardUrlUpdates) => void;
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
  const pathname = usePathname();
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

  // Single year parameter - always represents ISO week year
  const selectedYear = yearParam ? Number.parseInt(yearParam) : currentYear;
  const selectedQuarter = quarterParam
    ? (Number.parseInt(quarterParam) as 1 | 2 | 3 | 4)
    : currentQuarter;

  // Get quarter week info
  const { currentWeekNumber, startWeek, endWeek } = useQuarterWeekInfo(
    selectedYear,
    selectedQuarter
  );

  // Get view mode from pathname or use default based on screen size
  const defaultViewMode: ViewMode = isMobile ? 'focused' : 'quarterly';
  const pathViewMode = getViewModeFromPathname(pathname);
  const viewMode = pathViewMode ?? defaultViewMode;

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
    (params: DashboardUrlUpdates) => {
      const href = buildDashboardHref(viewMode, searchParams, params);
      router.replace(href, { scroll: false });
    },
    [router, searchParams, viewMode]
  );

  // Handle view mode changes
  const handleViewModeChange = useCallback(
    (newViewMode: ViewMode) => {
      if (newViewMode === viewMode) {
        if (pathViewMode != null && searchParams.toString() === '') {
          return;
        }
        router.replace(buildDashboardViewHref(newViewMode), { scroll: false });
        return;
      }

      router.replace(buildDashboardViewHref(newViewMode), { scroll: false });
    },
    [router, searchParams, viewMode, pathViewMode]
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
        const prevYear = selectedYear - 1;
        const weeksInPrevYear = getWeeksInYear(prevYear);
        updateUrlParams({ week: weeksInPrevYear, year: prevYear });
      } else {
        updateUrlParams({ week: selectedWeek - 1 });
      }
      return;
    }

    if (viewMode === 'daily') {
      if (selectedDayOfWeek === DayOfWeek.MONDAY) {
        // If we're on Monday, go to previous week's Sunday
        if (selectedWeek === 1) {
          const prevYear = selectedYear - 1;
          const weeksInPrevYear = getWeeksInYear(prevYear);
          updateUrlParams({
            week: weeksInPrevYear,
            year: prevYear,
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
    selectedDayOfWeek,
    updateUrlParams,
  ]);

  // Handle next navigation
  const handleNext = useCallback(() => {
    if (isAtMaxBound) return;

    const weeksInCurrentYear = getWeeksInYear(selectedYear);

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
        updateUrlParams({ week: 1, year: selectedYear + 1 });
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
            year: selectedYear + 1,
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
    selectedDayOfWeek,
    updateUrlParams,
  ]);

  // Handle toggle focus mode
  const toggleFocusMode = useCallback(() => {
    updateUrlParams({ focusMode: !(searchParams.get('focus-mode') === 'true') });
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

      // Selected values from URL (year is always ISO week year)
      selectedYear,
      selectedQuarter,
      selectedWeek,
      selectedDayOfWeek,
      viewMode,
      isFocusModeEnabled: searchParams.get('focus-mode') === 'true',

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
