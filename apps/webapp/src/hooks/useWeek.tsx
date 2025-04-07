import { createContext, useContext, useMemo, useRef } from 'react';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useQuery } from 'convex/react';
import { api } from '@services/backend/convex/_generated/api';
import { useSession } from '@/modules/auth/useSession';
import { DayOfWeek } from '@services/backend/src/constants';
import { WeekGoalsTree } from '@services/backend/src/usecase/getWeekDetails';
import { useOptimisticArray, isOptimisticId } from './useOptimistic';
import { useGoalActions } from './useGoalActions';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { toast } from '@/components/ui/use-toast';

// Modify how we extend GoalWithDetailsAndChildren to add isOptimistic flag
export type GoalWithOptimisticStatus = GoalWithDetailsAndChildren & {
  isOptimistic?: boolean;
  // Explicitly define isComplete and completedAt here since they've been moved from state to the goal object
  isComplete: boolean;
  completedAt?: number;
};

interface WeekContextValue {
  quarterlyGoals: GoalWithDetailsAndChildren[];
  weeklyGoals: GoalWithDetailsAndChildren[];
  dailyGoals: GoalWithDetailsAndChildren[];
  weekNumber: number;
  year: number;
  quarter: number;
  days: Array<{
    dayOfWeek: number;
    date: string;
    dateTimestamp: number;
  }>;
  stats: {
    totalTasks: number;
    completedTasks: number;
  };
  createWeeklyGoalOptimistic: (
    parentId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  deleteWeeklyGoalOptimistic: (goalId: Id<'goals'>) => Promise<void>;
  createDailyGoalOptimistic: (
    parentId: Id<'goals'>,
    title: string,
    dayOfWeek: DayOfWeek,
    dateTimestamp: number,
    details?: string
  ) => Promise<void>;
  deleteDailyGoalOptimistic: (goalId: Id<'goals'>) => Promise<void>;
  deleteGoalOptimistic: (goalId: Id<'goals'>) => Promise<void>;
}

interface WeekProviderWithoutDashboardProps {
  weekData: WeekData;
  children: React.ReactNode;
}

export const WeekProviderWithoutDashboard = ({
  weekData,
  children,
}: WeekProviderWithoutDashboardProps) => {
  const { createWeeklyGoal, deleteGoal, createDailyGoal } = useGoalActions();
  const allGoals = weekData.tree.allGoals;

  // Simple counter for optimistic items
  const optimisticCounter = useRef(0);

  // Create optimistic arrays for each goal type
  const [optimisticWeeklyGoals, doWeeklyGoalAction] = useOptimisticArray<
    GoalWithOptimisticStatus[],
    GoalWithOptimisticStatus
  >(allGoals.filter((goal) => goal.depth === 1));

  const [optimisticDailyGoals, doDailyGoalAction] = useOptimisticArray<
    GoalWithOptimisticStatus[],
    GoalWithOptimisticStatus
  >(allGoals.filter((goal) => goal.depth === 2));

  const weekContextValue = useMemo(() => {
    // Get base quarterly goals
    const baseQuarterlyGoals = allGoals.filter((goal) => goal.depth === 0);

    // Create a map of quarterly goals by ID for faster lookup
    const quarterlyGoalsMap = new Map<Id<'goals'>, GoalWithOptimisticStatus>(
      baseQuarterlyGoals.map((goal) => [goal._id, { ...goal, children: [] }])
    );

    // Get all weekly goals (both real and optimistic)
    const allWeeklyGoals =
      optimisticWeeklyGoals ?? allGoals.filter((goal) => goal.depth === 1);

    // Add isOptimistic flag based on ID
    const weeklyGoalsWithStatus = allWeeklyGoals.map((goal) => ({
      ...goal,
      isOptimistic: isOptimisticId(goal._id),
    }));

    // Get all daily goals (both real and optimistic)
    const allDailyGoals =
      optimisticDailyGoals ?? allGoals.filter((goal) => goal.depth === 2);

    // Add isOptimistic flag based on ID
    const dailyGoalsWithStatus = allDailyGoals.map((goal) => ({
      ...goal,
      isOptimistic: isOptimisticId(goal._id),
    }));

    // Distribute weekly goals to their parent quarterly goals
    weeklyGoalsWithStatus.forEach((weeklyGoal) => {
      if (weeklyGoal.parentId) {
        const parentGoal = quarterlyGoalsMap.get(weeklyGoal.parentId);
        if (parentGoal) {
          parentGoal.children.push(weeklyGoal);
        }
      }
    });

    // Sort weekly goals by name within each quarterly goal
    quarterlyGoalsMap.forEach((quarterlyGoal) => {
      quarterlyGoal.children.sort((a, b) => a.title.localeCompare(b.title));
    });

    // Distribute daily goals to their parent weekly goals
    weeklyGoalsWithStatus.forEach((weeklyGoal) => {
      weeklyGoal.children = dailyGoalsWithStatus.filter(
        (dailyGoal) => dailyGoal.parentId === weeklyGoal._id
      );
    });

    // Convert map back to array
    const quarterlyGoals = Array.from(quarterlyGoalsMap.values());

    // Always calculate stats on the frontend now that backend stats are removed
    const stats = {
      totalTasks: dailyGoalsWithStatus.length,
      completedTasks: dailyGoalsWithStatus.filter((goal) => goal.isComplete)
        .length,
    };

    return {
      quarterlyGoals,
      weeklyGoals: weeklyGoalsWithStatus,
      dailyGoals: dailyGoalsWithStatus,
      weekNumber: weekData.weekNumber,
      year: weekData.year,
      quarter: weekData.quarter,
      days: weekData.days,
      stats,
      createWeeklyGoalOptimistic: async (
        parentId: Id<'goals'>,
        title: string,
        details?: string
      ) => {
        // Generate optimistic IDs using the new prefix
        const tempId =
          `optimistic_${optimisticCounter.current++}` as Id<'goals'>;

        // Create a minimal optimistic goal with only the fields we need for UI rendering
        const optimisticGoal: GoalWithOptimisticStatus = {
          _id: tempId,
          _creationTime: Date.now(),
          userId: 'temp_user' as Id<'users'>,
          year: weekData.year,
          quarter: weekData.quarter,
          title,
          details,
          parentId,
          inPath: '',
          depth: 1,
          children: [],
          path: '',
          isOptimistic: true,
          isComplete: false,
          state: {
            _id: `optimistic_weekly_${tempId}` as Id<'goalStateByWeek'>,
            _creationTime: Date.now(),
            userId: 'temp_user' as Id<'users'>,
            year: weekData.year,
            quarter: weekData.quarter,
            goalId: tempId,
            weekNumber: weekData.weekNumber,
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
        // Add optimistic removal
        const removeOptimistic = doWeeklyGoalAction({
          type: 'remove',
          id: goalId,
        });

        try {
          // Perform actual deletion
          await deleteGoal({
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
      createDailyGoalOptimistic: async (
        parentId: Id<'goals'>,
        title: string,
        dayOfWeek: DayOfWeek,
        dateTimestamp: number,
        details?: string
      ) => {
        // Generate optimistic IDs
        const tempId =
          `optimistic_${optimisticCounter.current++}` as Id<'goals'>;

        // Create optimistic daily goal
        const optimisticGoal: GoalWithOptimisticStatus = {
          _id: tempId,
          _creationTime: Date.now(),
          userId: 'temp_user' as Id<'users'>,
          year: weekData.year,
          quarter: weekData.quarter,
          title,
          details,
          parentId,
          inPath: '',
          depth: 2,
          children: [],
          path: '',
          isOptimistic: true,
          isComplete: false,
          state: {
            _id: `optimistic_daily_${tempId}` as Id<'goalStateByWeek'>,
            _creationTime: Date.now(),
            userId: 'temp_user' as Id<'users'>,
            year: weekData.year,
            quarter: weekData.quarter,
            goalId: tempId,
            weekNumber: weekData.weekNumber,
            isStarred: false,
            isPinned: false,
            daily: {
              dayOfWeek,
              dateTimestamp,
            },
          },
        };

        // Add to optimistic state
        const removeOptimistic = doDailyGoalAction({
          type: 'append',
          value: optimisticGoal,
        });

        try {
          // Perform actual creation
          await createDailyGoal({
            title,
            details,
            parentId,
            weekNumber: weekData.weekNumber,
            dayOfWeek,
            dateTimestamp,
          });

          // Remove optimistic update after success
          removeOptimistic();
        } catch (error) {
          // Remove optimistic update on error
          removeOptimistic();
          throw error;
        }
      },
      deleteDailyGoalOptimistic: async (goalId: Id<'goals'>) => {
        // Add optimistic removal
        const removeOptimistic = doDailyGoalAction({
          type: 'remove',
          id: goalId,
        });

        try {
          // Perform actual deletion
          await deleteGoal({
            goalId,
          });

          // Remove optimistic update after success
          removeOptimistic();
        } catch (error) {
          // Remove optimistic update on error
          removeOptimistic();
          throw error;
        }
      },
      deleteGoalOptimistic: async (goalId: Id<'goals'>) => {
        // Find the goal in all goals to determine its type
        const goal = allGoals.find((g) => g._id === goalId);

        if (!goal) {
          toast({
            title: 'Failed to delete goal with id: ' + goalId,
            variant: 'destructive',
          });
          return;
        }

        // Determine goal type based on depth
        if (goal.depth === 1) {
          // Weekly goal
          const removeOptimistic = doWeeklyGoalAction({
            type: 'remove',
            id: goalId,
          });

          try {
            // Perform actual deletion
            await deleteGoal({
              goalId,
            });

            // The optimistic update will be automatically cleaned up when the query refreshes
            removeOptimistic();
          } catch (error) {
            // Revert optimistic update on error
            removeOptimistic();
            throw error;
          }
        } else if (goal.depth === 2) {
          // Daily goal
          const removeOptimistic = doDailyGoalAction({
            type: 'remove',
            id: goalId,
          });

          try {
            // Perform actual deletion
            await deleteGoal({
              goalId,
            });

            // Remove optimistic update after success
            removeOptimistic();
          } catch (error) {
            // Remove optimistic update on error
            removeOptimistic();
            throw error;
          }
        } else {
          // Quarterly goal or unknown type
          try {
            await deleteGoal({
              goalId,
            });
          } catch (error) {
            console.error('Failed to delete goal:', error);
            throw error;
          }
        }
      },
    };
  }, [
    allGoals,
    optimisticWeeklyGoals,
    optimisticDailyGoals,
    weekData.weekNumber,
    weekData.year,
    weekData.quarter,
    weekData.days,
    createWeeklyGoal,
    deleteGoal,
    createDailyGoal,
    doWeeklyGoalAction,
    doDailyGoalAction,
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

  // Call useGoalActions to get its functionality
  const goalActions = useGoalActions();

  // Combine the context with goalActions
  return useMemo(
    () => ({
      ...context,
      ...goalActions,
    }),
    [context, goalActions]
  );
};

const WeekContext = createContext<WeekContextValue | undefined>(undefined);

export interface WeekData {
  weekLabel: string;
  weekNumber: number;
  mondayDate: string;
  year: number;
  quarter: number;
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

  return useMemo(
    () =>
      weekDetails
        ? {
            ...weekDetails,
            year,
            quarter,
          }
        : undefined,
    [year, quarter, weekDetails]
  );
};
