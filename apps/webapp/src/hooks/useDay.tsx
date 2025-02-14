import { createContext, useContext, useMemo } from 'react';
import { useWeek } from './useWeek';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import React from 'react';

type DailyGoalsViewModel = {
  dayOfWeek: number;
  date: string;
  dateTimestamp: number;
  weeklyGoals: {
    weeklyGoal: GoalWithDetailsAndChildren;
    quarterlyGoal: GoalWithDetailsAndChildren;
    dailyGoals: GoalWithDetailsAndChildren[];
  }[];
};

interface DayContextValue {
  dayOfWeek: number;
  date: string;
  dateTimestamp: number;
  dailyGoalsView: DailyGoalsViewModel;
}

const DayContext = createContext<DayContextValue | undefined>(undefined);

interface DayProviderProps {
  dayOfWeek: number;
  date: string;
  dateTimestamp: number;
  children: React.ReactNode;
}

export const DayProvider = ({
  dayOfWeek,
  date,
  dateTimestamp,
  children,
}: DayProviderProps) => {
  const { quarterlyGoals } = useWeek();

  const dailyGoalsView = useMemo(() => {
    // Get all weekly goals with their parent quarterly goals and daily goals
    const weeklyGoals = quarterlyGoals.flatMap((quarterlyGoal) =>
      quarterlyGoal.children.map((weeklyGoal) => {
        // Filter daily goals for this specific day
        const dailyGoals = weeklyGoal.children.filter(
          (dailyGoal) => dailyGoal.state?.daily?.dayOfWeek === dayOfWeek
        );

        return {
          weeklyGoal,
          quarterlyGoal,
          dailyGoals,
        };
      })
    );

    return {
      dayOfWeek,
      date,
      dateTimestamp,
      weeklyGoals,
    };
  }, [quarterlyGoals, dayOfWeek, date, dateTimestamp]);

  const value = useMemo(
    () => ({
      dayOfWeek,
      date,
      dateTimestamp,
      dailyGoalsView,
    }),
    [dayOfWeek, date, dateTimestamp, dailyGoalsView]
  );

  return <DayContext.Provider value={value}>{children}</DayContext.Provider>;
};

export const useDay = () => {
  const context = useContext(DayContext);
  if (!context) {
    throw new Error('useDay must be used within a DayProvider');
  }
  return context;
};
