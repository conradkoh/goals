import { createContext, useContext, useMemo } from 'react';
import { useDashboard } from './useDashboard';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';

interface WeekContextValue {
  quarterlyGoals: GoalWithDetailsAndChildren[];
  weeklyGoals: GoalWithDetailsAndChildren[];
  dailyGoals: GoalWithDetailsAndChildren[];
  weekNumber: number;
  days: Array<{
    dayOfWeek: number;
    date: string;
    dateTimestamp: number;
  }>;
}

const WeekContext = createContext<WeekContextValue | undefined>(undefined);

interface WeekProviderProps {
  weekNumber: number;
  children: React.ReactNode;
}

export const WeekProvider = ({ weekNumber, children }: WeekProviderProps) => {
  const { weekData } = useDashboard();

  const weekContextValue = useMemo(() => {
    const currentWeek = weekData.find((week) => week.weekNumber === weekNumber);
    if (!currentWeek) {
      throw new Error(`Week ${weekNumber} not found in weekData`);
    }

    // Get all goals for this week
    const allGoals = currentWeek.tree.allGoals;

    // Organize goals by depth
    const quarterlyGoals = allGoals.filter((goal) => goal.depth === 0);
    const weeklyGoals = allGoals.filter((goal) => goal.depth === 1);
    const dailyGoals = allGoals.filter((goal) => goal.depth === 2);

    return {
      quarterlyGoals,
      weeklyGoals,
      dailyGoals,
      weekNumber,
      days: currentWeek.days,
    };
  }, [weekData, weekNumber]);

  return (
    <WeekContext.Provider value={weekContextValue}>
      {children}
    </WeekContext.Provider>
  );
};

export const useWeek = () => {
  const context = useContext(WeekContext);
  if (!context) {
    throw new Error('useWeek must be used within a WeekProvider');
  }
  return context;
};
