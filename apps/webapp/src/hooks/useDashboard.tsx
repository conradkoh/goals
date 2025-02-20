'use client';

import { useSession } from '@/modules/auth/useSession';
import { api } from '@services/backend/convex/_generated/api';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { WeekGoalsTree } from '@services/backend/src/usecase/getWeekDetails';
import { useMutation, useQuery } from 'convex/react';
import { FunctionReference } from 'convex/server';
import { DateTime } from 'luxon';
import React, { createContext, useContext, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { DayOfWeek } from '@services/backend/src/constants';
import { useWeek } from './useWeek';

interface WeekData {
  weekLabel: string;
  weekNumber: number;
  mondayDate: string;
  days: Array<{
    dayOfWeek: DayOfWeek;
    date: string;
    dateTimestamp: number;
  }>;

  // actual data
  tree: WeekGoalsTree;
}

type IndexedQuarterlyGoalsByWeek = Record<number, WeekGoalsTree>;

// Helper function to generate weeks for a quarter
const generateWeeksForQuarter = (
  year: number,
  quarter: 1 | 2 | 3 | 4,
  quarterOverview: IndexedQuarterlyGoalsByWeek
): WeekData[] => {
  const startDate = DateTime.local(year, (quarter - 1) * 3 + 1, 1);
  const endDate = startDate.plus({ months: 3 }).minus({ days: 1 });
  const startWeek = startDate.weekNumber;
  const endWeek = endDate.weekNumber;

  const weeks: WeekData[] = [];
  for (let weekNum = startWeek; weekNum <= endWeek; weekNum++) {
    const weekStart = DateTime.fromObject({
      weekNumber: weekNum,
      weekYear: year,
    }).startOf('week');

    weeks.push({
      weekLabel: `Week ${weekNum}`,
      weekNumber: weekNum,
      mondayDate: weekStart.toFormat('LLL d'),
      days: Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: (i + 1) as DayOfWeek,
        date: weekStart.plus({ days: i }).toFormat('LLL d'),
        dateTimestamp: weekStart.plus({ days: i }).toMillis(),
      })),
      tree: quarterOverview[weekNum] || {
        quarterlyGoals: [],
        weekNumber: weekNum,
        allGoals: [],
      },
    });
  }
  return weeks;
};

export const useDashboard = () => {
  const val = useContext(DashboardContext);
  if (val === 'not-found') {
    throw new Error('DashboardProvider not found');
  }
  return val;
};

interface DashboardContextValue {
  data: AsyncQueryReturnType<typeof api.dashboard.getQuarterOverview>;
  isLoading: boolean;
  currentDate: DateTime;
  currentYear: number;
  currentQuarter: 1 | 2 | 3 | 4;
  currentWeekNumber: number;
  currentMonth: number;
  currentMonthName: string;
  currentDayOfMonth: number;
  currentDayName: string;
  weekData: WeekData[];
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
  const { sessionId } = useSession();
  const searchParams = useSearchParams();

  // Use a single source of truth for current date
  const currentDate = DateTime.now();

  // Derive all date-related values from currentDate
  const currentYear = currentDate.year;
  const currentMonth = currentDate.month;
  const currentMonthName = currentDate.monthLong;
  const currentDayOfMonth = currentDate.day;
  const currentDayName = currentDate.weekdayLong;
  const currentWeekNumber = currentDate.weekNumber;
  const currentQuarter = Math.ceil(currentDate.month / 3) as 1 | 2 | 3 | 4;

  // Get year and quarter from URL or use current values
  const selectedYear = searchParams.get('year')
    ? parseInt(searchParams.get('year')!)
    : currentYear;
  const selectedQuarter = searchParams.get('quarter')
    ? (parseInt(searchParams.get('quarter')!) as 1 | 2 | 3 | 4)
    : currentQuarter;

  const weeksForQuarter = useQuery(api.dashboard.getQuarterOverview, {
    sessionId,
    year: selectedYear,
    quarter: selectedQuarter,
  });

  const weekData = useMemo(() => {
    if (weeksForQuarter === undefined) {
      return undefined; //propagate the loading state
    }
    const data = generateWeeksForQuarter(
      selectedYear,
      selectedQuarter,
      weeksForQuarter
    );
    return data;
  }, [weeksForQuarter, selectedYear, selectedQuarter]);

  const value = useMemo(
    () => ({
      data: weeksForQuarter,
      isLoading: weeksForQuarter === undefined,
      currentDate,
      currentYear,
      currentQuarter,
      currentWeekNumber,
      currentMonth,
      currentMonthName,
      currentDayOfMonth,
      currentDayName,
      weekData: weekData ?? [],
      selectedYear,
      selectedQuarter,
    }),
    [
      weeksForQuarter,
      currentDate,
      currentYear,
      currentQuarter,
      currentWeekNumber,
      currentMonth,
      currentMonthName,
      currentDayOfMonth,
      currentDayName,
      weekData,
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
