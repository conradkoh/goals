'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@services/backend/convex/_generated/api';
import { useSession } from '@/modules/auth/useSession';
import { useQuery } from 'convex/react';
import { FunctionReference } from 'convex/server';
import { DateTime } from 'luxon';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { QuarterlyGoalBase, QuarterlyGoalState } from '@/types/goals';

interface WeekData {
  weekLabel: string;
  weekNumber: number;
  days: string[];
  quarterlyGoal: QuarterlyGoalBase;
  quarterlyGoalState: QuarterlyGoalState;
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
      quarterlyGoal: {
        id: '', // Will be populated from backend if exists
        title: 'Set your quarterly goal',
        path: '',
        quarter,
        weeklyGoals: [],
      },
      quarterlyGoalState: {
        id: '',
        isComplete: false,
        progress: 0,
        isStarred: false,
        isPinned: false,
        weeklyGoalStates: [],
      },
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
    const mainGoal = goals[0];

    return {
      ...week,
      quarterlyGoal: {
        id: mainGoal.goalId,
        title: mainGoal.title || 'Set your quarterly goal',
        path: `/goals/${mainGoal.goalId}`,
        quarter: week.quarterlyGoal.quarter,
        weeklyGoals: goals
          .filter((g) => g.depth === 1)
          .map((wg) => ({
            id: wg.goalId,
            title: wg.title || 'Set your weekly goal',
            path: `/goals/${mainGoal.goalId}/${wg.goalId}`,
            weekNumber: week.weekNumber,
            tasks: goals
              .filter((g) => g.depth === 2 && g.parentId === wg.goalId)
              .map((task) => ({
                id: task.goalId,
                title: task.title || 'New task',
                path: `/goals/${mainGoal.goalId}/${wg.goalId}/${task.goalId}`,
              })),
          })),
      },
      quarterlyGoalState: {
        id: mainGoal.goalId,
        isComplete: mainGoal.isComplete || false,
        progress: parseInt(mainGoal.progress || '0', 10),
        isStarred: mainGoal.isStarred || false,
        isPinned: mainGoal.isPinned || false,
        weeklyGoalStates: goals
          .filter((g) => g.depth === 1)
          .map((wg) => ({
            id: wg.goalId,
            isComplete: wg.isComplete || false,
            isHardComplete: wg.isComplete || false,
            taskStates: goals
              .filter((g) => g.depth === 2 && g.parentId === wg.goalId)
              .map((task) => ({
                id: task.goalId,
                isComplete: task.isComplete || false,
                date: DateTime.now().toISODate() || '',
              })),
          })),
      },
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

const DashboardContext = createContext<
  | {
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
    }
  | 'not-found'
>('not-found');

export const DashboardProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { sessionId } = useSession();
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
