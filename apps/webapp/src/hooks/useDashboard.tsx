'use client';

import { ViewMode } from '@/components/molecules/focus/constants';
import { useScreenSize } from '@/hooks/useScreenSize';
import { DayOfWeek } from '@/lib/constants';
import { FunctionReference } from 'convex/server';
import { DateTime } from 'luxon';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useCurrentDateTime } from './useCurrentDateTime';
import { useQuarterWeekInfo } from './useQuarterWeekInfo';

export const useDashboard = () => {
  const val = useContext(DashboardContext);
  if (val === 'not-found') {
    throw new Error('DashboardProvider not found');
  }
  return val;
};

interface DashboardContextValue {
  // Current date values
  currentDate: DateTime;
  currentYear: number;
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
  selectedDayOfWeek: DayOfWeek;
  viewMode: ViewMode;
  isFocusModeEnabled: boolean;

  // Navigation bounds
  startWeek: number;
  endWeek: number;
  isAtMinBound: boolean;
  isAtMaxBound: boolean;

  // URL update functions
  updateUrlParams: (params: {
    week?: number;
    day?: DayOfWeek;
    viewMode?: ViewMode;
    year?: number;
    quarter?: number;
    focusMode?: boolean;
  }) => void;
  handleViewModeChange: (newViewMode: ViewMode) => void;
  handleYearQuarterChange: (year: number, quarter: number) => void;
  handleWeekNavigation: (weekNumber: number) => void;
  handleDayNavigation: (weekNumber: number, dayOfWeek: DayOfWeek) => void;
  handlePrevious: () => void;
  handleNext: () => void;
  toggleFocusMode: () => void;
}

const DashboardContext = createContext<DashboardContextValue | 'not-found'>(
  'not-found'
);

export const DashboardProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isMobile } = useScreenSize();

  // Use reactive current date
  const currentDate = useCurrentDateTime();

  // Derive all date-related values from currentDate
  const currentYear = currentDate.year;
  const currentMonth = currentDate.month;
  const currentMonthName = currentDate.monthLong;
  const currentDayOfMonth = currentDate.day;
  const currentDayName = currentDate.weekdayLong;
  const currentQuarter = Math.ceil(currentDate.month / 3) as 1 | 2 | 3 | 4;

  // Get year and quarter from URL or use current values
  const selectedYear = searchParams.get('year')
    ? parseInt(searchParams.get('year')!)
    : currentYear;
  const selectedQuarter = searchParams.get('quarter')
    ? (parseInt(searchParams.get('quarter')!) as 1 | 2 | 3 | 4)
    : currentQuarter;

  // Get quarter week info
  const { currentWeekNumber, startWeek, endWeek } = useQuarterWeekInfo(
    selectedYear,
    selectedQuarter
  );

  // Get view mode from URL or use default based on screen size
  const viewModeFromUrl = searchParams.get('viewMode') as ViewMode | null;
  const viewMode = viewModeFromUrl || (isMobile ? 'weekly' : 'quarterly');

  // Get selected week from URL or use current week
  const weekFromUrl = searchParams.get('week');
  const selectedWeek = weekFromUrl ? parseInt(weekFromUrl) : currentWeekNumber;

  // Get day from URL or use current day
  const dayFromUrl = searchParams.get('day');
  const selectedDayOfWeek = dayFromUrl
    ? (parseInt(dayFromUrl) as DayOfWeek)
    : (currentDate.weekday as DayOfWeek);

  // Calculate navigation bounds
  const isAtMinBound =
    viewMode === 'daily'
      ? selectedWeek === startWeek && selectedDayOfWeek === DayOfWeek.MONDAY
      : selectedWeek === startWeek;
  const isAtMaxBound =
    viewMode === 'daily'
      ? selectedWeek === endWeek && selectedDayOfWeek === DayOfWeek.SUNDAY
      : selectedWeek === endWeek;

  // Update URL helper function
  const updateUrlParams = useCallback(
    (params: {
      week?: number;
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

      router.push(`/dashboard?${newParams.toString()}`);
    },
    [router, searchParams]
  );

  // Handle view mode changes
  const handleViewModeChange = useCallback(
    (newViewMode: ViewMode) => {
      // Update URL with new view mode
      const params: { viewMode: ViewMode; week?: number; day?: DayOfWeek } = {
        viewMode: newViewMode,
      };

      // If changing to weekly or daily view, ensure week parameter is set
      if (
        (newViewMode === 'weekly' || newViewMode === 'daily') &&
        !searchParams.has('week')
      ) {
        params.week = currentWeekNumber;
      }

      // If changing to daily view, ensure day parameter is set
      if (newViewMode === 'daily' && !searchParams.has('day')) {
        params.day = currentDate.weekday as DayOfWeek;
      }

      updateUrlParams(params);
    },
    [updateUrlParams, searchParams, currentWeekNumber, currentDate.weekday]
  );

  // Handle year and quarter changes
  const handleYearQuarterChange = useCallback(
    (year: number, quarter: number) => {
      updateUrlParams({ year, quarter });
    },
    [updateUrlParams]
  );

  // Handle week navigation
  const handleWeekNavigation = useCallback(
    (weekNumber: number) => {
      updateUrlParams({ week: weekNumber });
    },
    [updateUrlParams]
  );

  // Handle day navigation
  const handleDayNavigation = useCallback(
    (weekNumber: number, dayOfWeek: DayOfWeek) => {
      updateUrlParams({ week: weekNumber, day: dayOfWeek });
    },
    [updateUrlParams]
  );

  // Handle previous navigation
  const handlePrevious = useCallback(() => {
    if (isAtMinBound) return;

    if (viewMode === 'weekly') {
      updateUrlParams({ week: selectedWeek - 1 });
      return;
    }

    if (selectedDayOfWeek === DayOfWeek.MONDAY) {
      // If we're on Monday and not at min week, go to previous week's Sunday
      updateUrlParams({
        week: selectedWeek - 1,
        day: DayOfWeek.SUNDAY,
      });
    } else {
      // Otherwise just go to previous day
      updateUrlParams({
        day: (selectedDayOfWeek - 1) as DayOfWeek,
      });
    }
  }, [
    isAtMinBound,
    viewMode,
    selectedWeek,
    selectedDayOfWeek,
    updateUrlParams,
  ]);

  // Handle next navigation
  const handleNext = useCallback(() => {
    if (isAtMaxBound) return;

    if (viewMode === 'weekly') {
      updateUrlParams({ week: selectedWeek + 1 });
      return;
    }

    if (selectedDayOfWeek === DayOfWeek.SUNDAY) {
      // If we're on Sunday and not at max week, go to next week's Monday
      updateUrlParams({
        week: selectedWeek + 1,
        day: DayOfWeek.MONDAY,
      });
    } else {
      // Otherwise just go to next day
      updateUrlParams({
        day: (selectedDayOfWeek + 1) as DayOfWeek,
      });
    }
  }, [
    isAtMaxBound,
    viewMode,
    selectedWeek,
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
      currentDate,
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
      selectedDayOfWeek,
      viewMode,
      isFocusModeEnabled: searchParams.get('focusMode') === 'true',

      // Navigation bounds
      startWeek,
      endWeek,
      isAtMinBound,
      isAtMaxBound,

      // URL update functions
      updateUrlParams,
      handleViewModeChange,
      handleYearQuarterChange,
      handleWeekNavigation,
      handleDayNavigation,
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
      startWeek,
      endWeek,
      isAtMinBound,
      isAtMaxBound,
      updateUrlParams,
      handleViewModeChange,
      handleYearQuarterChange,
      handleWeekNavigation,
      handleDayNavigation,
      handlePrevious,
      handleNext,
      toggleFocusMode,
    ]
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

type QueryReturnType<Query extends FunctionReference<'query'>> =
  Query['_returnType'];

type AsyncQueryReturnType<Query extends FunctionReference<'query'>> =
  | QueryReturnType<Query>
  | undefined;
