'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@services/backend/convex/_generated/api';
import { useSession } from '@/modules/auth/useSession';
import { useQuery, useMutation } from 'convex/react';
import { FunctionReference } from 'convex/server';
import { DateTime } from 'luxon';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { QuarterlyGoalBase, QuarterlyGoalState } from '@/types/goals';

interface WeekData {
  weekLabel: string;
  weekNumber: number;
  days: string[];
  quarterlyGoals: QuarterlyGoalBase[];
  quarterlyGoalStates: QuarterlyGoalState[];
  mondayDate: string;
}

// Helper function to generate weeks for a quarter
const generateWeeksForQuarter = (
  year: number,
  quarter: 1 | 2 | 3 | 4
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
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      quarterlyGoals: [],
      quarterlyGoalStates: [],
    });
  }
  return weeks;
};

// Transform backend data to frontend format
const mergeBackendData = (
  weeks: WeekData[],
  weekSummaries?: Record<number, { weekNumber: number; goals: any[] }>
): WeekData[] => {
  if (!weekSummaries) return weeks;

  return weeks.map((week) => {
    const weekSummary = weekSummaries[week.weekNumber];
    if (!weekSummary || !weekSummary.goals.length) {
      return week; // Return the empty week structure if no data
    }

    const goals = weekSummary.goals;

    // Group goals by depth
    const quarterlyGoals = goals.filter((g) => g.depth === 0);
    const weeklyGoals = goals.filter((g) => g.depth === 1);
    const dailyGoals = goals.filter((g) => g.depth === 2);

    // Transform quarterly goals
    const transformedQuarterlyGoals = quarterlyGoals.map((goal) => ({
      id: goal.goalId,
      title: goal.title || 'Set your quarterly goal',
      path: `/goals/${goal.goalId}`,
      quarter: week.quarterlyGoals[0]?.quarter || 1,
      weeklyGoals: weeklyGoals
        .filter((wg) => wg.parentId === goal.goalId)
        .map((wg) => ({
          id: wg.goalId,
          title: wg.title || 'Set your weekly goal',
          path: `/goals/${goal.goalId}/${wg.goalId}`,
          weekNumber: week.weekNumber,
          tasks: dailyGoals
            .filter((dg) => dg.parentId === wg.goalId)
            .map((task) => ({
              id: task.goalId,
              title: task.title || 'New task',
              path: `/goals/${goal.goalId}/${wg.goalId}/${task.goalId}`,
            })),
        })),
    }));

    // Transform quarterly goal states
    const transformedQuarterlyGoalStates = quarterlyGoals.map((goal) => ({
      id: goal.goalId,
      isComplete: goal.isComplete || false,
      progress: parseInt(goal.progress || '0', 10),
      isStarred: goal.isStarred || false,
      isPinned: goal.isPinned || false,
      weeklyGoalStates: weeklyGoals
        .filter((wg) => wg.parentId === goal.goalId)
        .map((wg) => ({
          id: wg.goalId,
          isComplete: wg.isComplete || false,
          isHardComplete: wg.isComplete || false,
          taskStates: dailyGoals
            .filter((dg) => dg.parentId === wg.goalId)
            .map((task) => ({
              id: task.goalId,
              isComplete: task.isComplete || false,
              date: DateTime.now().toISODate() || '',
            })),
        })),
    }));

    return {
      ...week,
      quarterlyGoals: transformedQuarterlyGoals,
      quarterlyGoalStates: transformedQuarterlyGoalStates,
    };
  });
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
  createQuarterlyGoal: (title: string) => Promise<void>;
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
  const updateQuarterlyGoalStatusMutation = useMutation(
    api.dashboard.updateQuarterlyGoalStatus
  );
  const updateQuarterlyGoalTitleMutation = useMutation(
    api.dashboard.updateQuarterlyGoalTitle
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

  const data = useQuery(api.dashboard.getQuarterOverview, {
    sessionId,
    year: currentYear,
    quarter: currentQuarter,
  });

  // Transform data into week data
  const weekData = mergeBackendData(
    generateWeeksForQuarter(currentYear, currentQuarter),
    data
  );

  const createQuarterlyGoal = async (title: string) => {
    await createQuarterlyGoalMutation({
      sessionId,
      year: currentYear,
      quarter: currentQuarter,
      title,
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

  return (
    <DashboardContext.Provider
      value={{
        data,
        isLoading: data === undefined,
        currentDate,
        currentYear,
        currentQuarter,
        currentWeekNumber,
        currentMonth,
        currentMonthName,
        currentDayOfMonth,
        currentDayName,
        weekData,
        createQuarterlyGoal,
        updateQuarterlyGoalStatus,
        updateQuarterlyGoalTitle,
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
