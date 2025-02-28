'use client';

import { useSession } from '@/modules/auth/useSession';
import { api } from '@services/backend/convex/_generated/api';
import { WeekGoalsTree } from '@services/backend/src/usecase/getWeekDetails';
import { useQuery } from 'convex/react';
import { FunctionReference } from 'convex/server';
import { DateTime } from 'luxon';
import React, { createContext, useContext, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuarterWeekInfo } from './useQuarterWeekInfo';
import { useCurrentDateTime } from './useCurrentDateTime';

export const useDashboard = () => {
  const val = useContext(DashboardContext);
  if (val === 'not-found') {
    throw new Error('DashboardProvider not found');
  }
  return val;
};

interface DashboardContextValue {
  currentDate: DateTime;
  currentYear: number;
  currentQuarter: 1 | 2 | 3 | 4;
  currentWeekNumber: number;
  currentMonth: number;
  currentMonthName: string;
  currentDayOfMonth: number;
  currentDayName: string;
  selectedYear: number; // Exposed selectedYear
  selectedQuarter: 1 | 2 | 3 | 4; // Exposed selectedQuarter
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
  const { currentWeekNumber } = useQuarterWeekInfo(
    selectedYear,
    selectedQuarter
  );

  const value = useMemo(
    () => ({
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
