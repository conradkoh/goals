'use client';

import { useSession } from '@/modules/auth/useSession';
import { api } from '@services/backend/convex/_generated/api';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { WeekGoalsTree } from '@services/backend/src/usecase/getWeekDetails';
import { useMutation, useQuery } from 'convex/react';
import { FunctionReference } from 'convex/server';
import { DateTime } from 'luxon';
import React, { createContext, useContext, useMemo } from 'react';

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
  createQuarterlyGoal: (title: string, isPinned?: boolean) => Promise<void>;
  createWeeklyGoal: (args: {
    title: string;
    parentId: Id<'goals'>;
    weekNumber: number;
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
  }) => Promise<void>;
  deleteQuarterlyGoal: (args: { goalId: Id<'goals'> }) => Promise<void>;
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
  const createQuarterlyGoalMutation = useMutation(
    api.dashboard.createQuarterlyGoal
  );
  const createWeeklyGoalMutation = useMutation(api.dashboard.createWeeklyGoal);
  const updateQuarterlyGoalStatusMutation = useMutation(
    api.dashboard.updateQuarterlyGoalStatus
  );
  const updateQuarterlyGoalTitleMutation = useMutation(
    api.dashboard.updateQuarterlyGoalTitle
  );
  const deleteQuarterlyGoalMutation = useMutation(
    api.dashboard.deleteQuarterlyGoal
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

  const weeksForQuarter = useQuery(api.dashboard.getQuarterOverview, {
    sessionId,
    year: currentYear,
    quarter: currentQuarter,
  });

  const weekData = useMemo(() => {
    if (weeksForQuarter === undefined) {
      return undefined; //propagate the loading state
    }
    const data = generateWeeksForQuarter(
      currentYear,
      currentQuarter,
      weeksForQuarter
    );
    return data;
  }, [weeksForQuarter]);

  // Transform data into week data

  const createQuarterlyGoal = async (title: string, isPinned?: boolean) => {
    await createQuarterlyGoalMutation({
      sessionId,
      year: currentYear,
      quarter: currentQuarter,
      title,
      isPinned,
    });
  };

  const createWeeklyGoal = async ({
    title,
    parentId,
    weekNumber,
  }: {
    title: string;
    parentId: Id<'goals'>;
    weekNumber: number;
  }) => {
    await createWeeklyGoalMutation({
      sessionId,
      title,
      parentId,
      weekNumber,
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
      year: currentYear,
      quarter: currentQuarter,
      weekNumber,
      goalId,
      isStarred,
      isPinned,
    });
  };

  const updateQuarterlyGoalTitle = async ({
    goalId,
    title,
  }: {
    goalId: Id<'goals'>;
    title: string;
  }) => {
    await updateQuarterlyGoalTitleMutation({
      sessionId,
      goalId,
      title,
    });
  };

  const deleteQuarterlyGoal = async ({ goalId }: { goalId: Id<'goals'> }) => {
    await deleteQuarterlyGoalMutation({
      sessionId,
      goalId,
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
        updateQuarterlyGoalStatus,
        updateQuarterlyGoalTitle,
        deleteQuarterlyGoal,
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
