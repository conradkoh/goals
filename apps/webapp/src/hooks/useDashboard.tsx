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

interface WeekData {
  weekLabel: string;
  weekNumber: number;
  mondayDate: string;
  days: Array<{
    dayOfWeek: number;
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
        dayOfWeek: i + 1,
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
  createQuarterlyGoal: (args: {
    title: string;
    details?: string;
    weekNumber: number;
    isPinned?: boolean;
    isStarred?: boolean;
  }) => Promise<void>;
  createWeeklyGoal: (args: {
    title: string;
    details?: string;
    parentId: Id<'goals'>;
    weekNumber: number;
  }) => Promise<void>;
  createDailyGoal: (args: {
    title: string;
    details?: string;
    parentId: Id<'goals'>;
    weekNumber: number;
    dayOfWeek: number;
    dateTimestamp: number;
  }) => Promise<void>;
  updateQuarterlyGoalStatus: (args: {
    weekNumber: number;
    goalId: Id<'goals'>;
    isStarred: boolean;
    isPinned: boolean;
  }) => Promise<void>;
  updateQuarterlyGoalTitle: (args: {
    goalId: Id<'goals'>;
    title: string;
    details?: string;
  }) => Promise<void>;
  deleteQuarterlyGoal: (args: { goalId: Id<'goals'> }) => Promise<void>;
  toggleGoalCompletion: (args: {
    goalId: Id<'goals'>;
    weekNumber: number;
    isComplete: boolean;
  }) => Promise<void>;
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
  const createQuarterlyGoalMutation = useMutation(
    api.dashboard.createQuarterlyGoal
  );
  const createWeeklyGoalMutation = useMutation(api.dashboard.createWeeklyGoal);
  const createDailyGoalMutation = useMutation(api.dashboard.createDailyGoal);
  const updateQuarterlyGoalStatusMutation = useMutation(
    api.dashboard.updateQuarterlyGoalStatus
  );
  const updateQuarterlyGoalTitleMutation = useMutation(
    api.dashboard.updateQuarterlyGoalTitle
  );
  const deleteQuarterlyGoalMutation = useMutation(
    api.dashboard.deleteQuarterlyGoal
  );
  const toggleGoalCompletionMutation = useMutation(
    api.dashboard.toggleGoalCompletion
  );

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

  // Transform data into week data

  const createQuarterlyGoal = async ({
    title,
    details,
    weekNumber,
    isPinned,
    isStarred,
  }: {
    title: string;
    details?: string;
    weekNumber: number;
    isPinned?: boolean;
    isStarred?: boolean;
  }) => {
    await createQuarterlyGoalMutation({
      sessionId,
      year: selectedYear,
      quarter: selectedQuarter,
      weekNumber,
      title,
      details,
      isPinned,
      isStarred,
    });
  };

  const createWeeklyGoal = async ({
    title,
    details,
    parentId,
    weekNumber,
  }: {
    title: string;
    details?: string;
    parentId: Id<'goals'>;
    weekNumber: number;
  }) => {
    await createWeeklyGoalMutation({
      sessionId,
      title,
      details,
      parentId,
      weekNumber,
    });
  };

  const createDailyGoal = async ({
    title,
    details,
    parentId,
    weekNumber,
    dayOfWeek,
    dateTimestamp,
  }: {
    title: string;
    details?: string;
    parentId: Id<'goals'>;
    weekNumber: number;
    dayOfWeek: number;
    dateTimestamp: number;
  }) => {
    await createDailyGoalMutation({
      sessionId,
      title,
      details,
      parentId,
      weekNumber,
      dayOfWeek,
      dateTimestamp,
    });
  };

  const updateQuarterlyGoalStatus = async ({
    weekNumber,
    goalId,
    isStarred,
    isPinned,
  }: {
    weekNumber: number;
    goalId: Id<'goals'>;
    isStarred: boolean;
    isPinned: boolean;
  }) => {
    await updateQuarterlyGoalStatusMutation({
      sessionId,
      year: selectedYear,
      quarter: selectedQuarter,
      weekNumber,
      goalId,
      isStarred,
      isPinned,
    });
  };

  const updateQuarterlyGoalTitle = async ({
    goalId,
    title,
    details,
  }: {
    goalId: Id<'goals'>;
    title: string;
    details?: string;
  }) => {
    await updateQuarterlyGoalTitleMutation({
      sessionId,
      goalId,
      title,
      details,
    });
  };

  const deleteQuarterlyGoal = async ({ goalId }: { goalId: Id<'goals'> }) => {
    await deleteQuarterlyGoalMutation({
      sessionId,
      goalId,
    });
  };

  const toggleGoalCompletion = async ({
    goalId,
    weekNumber,
    isComplete,
  }: {
    goalId: Id<'goals'>;
    weekNumber: number;
    isComplete: boolean;
  }) => {
    await toggleGoalCompletionMutation({
      sessionId,
      goalId,
      weekNumber,
      isComplete,
    });
  };

  return (
    <DashboardContext.Provider
      value={{
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
        createQuarterlyGoal,
        createWeeklyGoal,
        createDailyGoal,
        updateQuarterlyGoalStatus,
        updateQuarterlyGoalTitle,
        deleteQuarterlyGoal,
        toggleGoalCompletion,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

type QueryReturnType<Query extends FunctionReference<'query'>> =
  Query['_returnType'];

type AsyncQueryReturnType<Query extends FunctionReference<'query'>> =
  | QueryReturnType<Query>
  | undefined;
