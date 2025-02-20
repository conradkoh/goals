import { createContext, useContext, useMemo } from 'react';
import { useDashboard } from './useDashboard';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useQuery } from 'convex/react';
import { api } from '@services/backend/convex/_generated/api';
import { useSession } from '@/modules/auth/useSession';
import { DayOfWeek } from '@services/backend/src/constants';
import { WeekGoalsTree } from '@services/backend/src/usecase/getWeekDetails';

// Deprecated: WeekProviderProps is no longer recommended for use.
interface WeekProviderProps {
  weekNumber: number;
  children: React.ReactNode;
}

// Deprecated: WeekProvider is no longer recommended for use.
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

interface WeekProviderWithoutDashboardProps {
  weekData: WeekData;
  children: React.ReactNode;
}

export const WeekProviderWithoutDashboard = ({
  weekData,
  children,
}: WeekProviderWithoutDashboardProps) => {
  const weekContextValue = useMemo(() => {
    const allGoals = weekData.tree.allGoals;
    return {
      quarterlyGoals: allGoals.filter((goal) => goal.depth === 0),
      weeklyGoals: allGoals.filter((goal) => goal.depth === 1),
      dailyGoals: allGoals.filter((goal) => goal.depth === 2),
      weekNumber: weekData.weekNumber,
      days: weekData.days,
    };
  }, [weekData]);

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
export interface WeekData {
  weekLabel: string;
  weekNumber: number;
  mondayDate: string;
  days: Array<{
    dayOfWeek: DayOfWeek;
    date: string;
    dateTimestamp: number;
  }>;
  tree: WeekGoalsTree;
}

interface Week2Params {
  year: number;
  quarter: number;
  week: number;
}

export const useWeekWithoutDashboard = ({
  year,
  quarter,
  week,
}: Week2Params): WeekData | undefined => {
  const { sessionId } = useSession();
  const weekDetails = useQuery(api.dashboard.getWeek, {
    sessionId,
    year,
    quarter,
    weekNumber: week,
  });

  return weekDetails;
};
