import { createContext, useContext, useMemo } from 'react';
import { useDashboard } from './useDashboard';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useQuery } from 'convex/react';
import { api } from '@services/backend/convex/_generated/api';
import { useSession } from '@/modules/auth/useSession';
import { DayOfWeek } from '@services/backend/src/constants';
import { WeekGoalsTree } from '@services/backend/src/usecase/getWeekDetails';
import { useOptimisticArray } from './useOptimistic';
import { useGoalActions } from './useGoalActions';
import { Id } from '@services/backend/convex/_generated/dataModel';

// Deprecated: WeekProviderProps is no longer recommended for use.
interface WeekProviderProps {
  weekNumber: number;
  children: React.ReactNode;
}

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
  createWeeklyGoalOptimistic: (
    parentId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  deleteWeeklyGoalOptimistic: (goalId: Id<'goals'>) => Promise<void>;
}

// Deprecated: WeekProvider is no longer recommended for use.
export const WeekProvider = ({ weekNumber, children }: WeekProviderProps) => {
  const { weekData } = useDashboard();
  const { createWeeklyGoal, deleteQuarterlyGoal } = useGoalActions();

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
      createWeeklyGoalOptimistic: async (
        parentId: Id<'goals'>,
        title: string,
        details?: string
      ) => {
        await createWeeklyGoal({
          title,
          details,
          parentId,
          weekNumber,
        });
      },
      deleteWeeklyGoalOptimistic: async (goalId: Id<'goals'>) => {
        await deleteQuarterlyGoal({
          goalId,
        });
      },
    };
  }, [weekData, weekNumber, createWeeklyGoal, deleteQuarterlyGoal]);

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
  const { createWeeklyGoal, deleteQuarterlyGoal } = useGoalActions();
  const allGoals = weekData.tree.allGoals;

  // Create optimistic arrays for each goal type
  const [optimisticWeeklyGoals, doWeeklyGoalAction] = useOptimisticArray<
    GoalWithDetailsAndChildren[],
    GoalWithDetailsAndChildren
  >(allGoals.filter((goal) => goal.depth === 1));

  const weekContextValue = useMemo(() => {
    // Get base quarterly goals
    const baseQuarterlyGoals = allGoals.filter((goal) => goal.depth === 0);

    // Create a map of quarterly goals by ID for faster lookup
    const quarterlyGoalsMap = new Map<Id<'goals'>, GoalWithDetailsAndChildren>(
      baseQuarterlyGoals.map((goal) => [goal._id, { ...goal, children: [] }])
    );

    // Get all weekly goals (both real and optimistic)
    const allWeeklyGoals =
      optimisticWeeklyGoals ?? allGoals.filter((goal) => goal.depth === 1);

    // Distribute weekly goals to their parent quarterly goals
    allWeeklyGoals.forEach((weeklyGoal) => {
      if (weeklyGoal.parentId) {
        const parentGoal = quarterlyGoalsMap.get(weeklyGoal.parentId);
        if (parentGoal) {
          parentGoal.children.push(weeklyGoal);
        }
      }
    });

    // Convert map back to array
    const quarterlyGoals = Array.from(quarterlyGoalsMap.values());

    return {
      quarterlyGoals,
      weeklyGoals: allWeeklyGoals,
      dailyGoals: allGoals.filter((goal) => goal.depth === 2),
      weekNumber: weekData.weekNumber,
      days: weekData.days,
      createWeeklyGoalOptimistic: async (
        parentId: Id<'goals'>,
        title: string,
        details?: string
      ) => {
        // Create a minimal optimistic goal with only the fields we need for UI rendering
        const optimisticGoal: GoalWithDetailsAndChildren = {
          _id: 'temp_id' as Id<'goals'>,
          _creationTime: Date.now(),
          userId: 'temp_user' as Id<'users'>, // This is fine since it's temporary
          year: weekData.weekNumber, // These values don't matter for optimistic UI
          quarter: 1,
          title,
          details,
          parentId,
          inPath: '', // This is fine since it's temporary
          depth: 1,
          children: [],
          path: '', // This is fine since it's temporary
          state: {
            _id: 'temp_weekly_id' as Id<'goalsWeekly'>,
            _creationTime: Date.now(),
            userId: 'temp_user' as Id<'users'>,
            year: weekData.weekNumber,
            quarter: 1,
            goalId: 'temp_id' as Id<'goals'>,
            weekNumber: weekData.weekNumber,
            progress: '',
            isComplete: false,
            isStarred: false,
            isPinned: false,
          },
        };

        // Add to optimistic state
        const removeOptimistic = doWeeklyGoalAction({
          type: 'append',
          value: optimisticGoal,
        });

        try {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for 2 seconds
          // Perform actual creation
          await createWeeklyGoal({
            title,
            details,
            parentId,
            weekNumber: weekData.weekNumber,
          });

          // Remove optimistic update after success
          removeOptimistic();
        } catch (error) {
          // Remove optimistic update on error
          removeOptimistic();
          throw error;
        }
      },
      deleteWeeklyGoalOptimistic: async (goalId: Id<'goals'>) => {
        // Find the index of the goal to remove
        const goalIndex = allWeeklyGoals.findIndex(
          (goal) => goal._id === goalId
        );
        if (goalIndex === -1) return;

        // Add optimistic removal
        const removeOptimistic = doWeeklyGoalAction({
          type: 'remove',
          index: goalIndex,
        });

        try {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for 2 seconds
          // Perform actual deletion
          await deleteQuarterlyGoal({
            goalId,
          });

          // The optimistic update will be automatically cleaned up when the query refreshes
          removeOptimistic();
        } catch (error) {
          // Revert optimistic update on error
          removeOptimistic();
          throw error;
        }
      },
    };
  }, [
    allGoals,
    optimisticWeeklyGoals,
    weekData.weekNumber,
    weekData.days,
    createWeeklyGoal,
    deleteQuarterlyGoal,
    doWeeklyGoalAction,
  ]);

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
