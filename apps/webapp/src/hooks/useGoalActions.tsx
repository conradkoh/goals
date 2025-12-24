import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { errorTitles } from '@workspace/backend/errors';
import type { DayOfWeek } from '@workspace/backend/src/constants';
import { useMutation } from 'convex/react';
import { useMemo } from 'react';

import { toast } from '@/components/ui/use-toast';
import { parseConvexError } from '@/lib/error';
import { useSession } from '@/modules/auth/useSession';

/**
 * Parameters for creating a quarterly goal.
 *
 * @public
 */
export interface CreateQuarterlyGoalParams {
  /** Title of the quarterly goal */
  title: string;
  /** Optional detailed description */
  details?: string;
  /** Optional due date timestamp in milliseconds */
  dueDate?: number;
  /** Week number within the quarter (1-13) */
  weekNumber: number;
  /** Whether the goal should be pinned to the top */
  isPinned?: boolean;
  /** Whether the goal is marked as starred/important */
  isStarred?: boolean;
  /** Year of the goal (e.g., 2025) */
  year: number;
  /** Quarter number (1-4) */
  quarter: number;
}

/**
 * Parameters for creating a weekly goal.
 *
 * @public
 */
export interface CreateWeeklyGoalParams {
  /** Title of the weekly goal */
  title: string;
  /** Optional detailed description */
  details?: string;
  /** Optional due date timestamp in milliseconds */
  dueDate?: number;
  /** ID of the parent quarterly goal */
  parentId: Id<'goals'>;
  /** Week number within the quarter (1-13) */
  weekNumber: number;
}

/**
 * Parameters for creating a daily goal.
 *
 * @public
 */
export interface CreateDailyGoalParams {
  /** Title of the daily goal */
  title: string;
  /** Optional detailed description */
  details?: string;
  /** Optional due date timestamp in milliseconds */
  dueDate?: number;
  /** ID of the parent weekly goal */
  parentId: Id<'goals'>;
  /** Week number within the quarter (1-13) */
  weekNumber: number;
  /** Day of week (1=Monday, 7=Sunday) */
  dayOfWeek: DayOfWeek;
  /** Optional timestamp representing the specific date */
  dateTimestamp?: number;
}

/**
 * Parameters for updating quarterly goal status flags.
 *
 * @public
 */
export interface UpdateQuarterlyGoalStatusParams {
  /** Week number within the quarter (1-13) */
  weekNumber: number;
  /** ID of the goal to update */
  goalId: Id<'goals'>;
  /** Whether the goal is starred/important */
  isStarred: boolean;
  /** Whether the goal is pinned to the top */
  isPinned: boolean;
  /** Year of the goal (e.g., 2025) */
  year: number;
  /** Quarter number (1-4) */
  quarter: number;
}

/**
 * Parameters for updating quarterly goal content.
 *
 * @public
 */
export interface UpdateQuarterlyGoalTitleParams {
  /** ID of the goal to update */
  goalId: Id<'goals'>;
  /** New title for the goal */
  title: string;
  /** Optional updated description */
  details?: string;
  /** Optional updated due date timestamp */
  dueDate?: number;
  /** Optional domain/category ID for the goal. Null removes the domain assignment. */
  domainId?: Id<'domains'> | null;
}

/**
 * Parameters for deleting a goal.
 *
 * @public
 */
export interface DeleteGoalParams {
  /** ID of the goal to delete */
  goalId: Id<'goals'>;
}

/**
 * Parameters for toggling goal completion status.
 *
 * @public
 */
export interface ToggleGoalCompletionParams {
  /** ID of the goal to toggle */
  goalId: Id<'goals'>;
  /** Week number within the quarter (1-13) */
  weekNumber: number;
  /** New completion status */
  isComplete: boolean;
  /** Whether to also update child goals with the same completion status */
  updateChildren?: boolean;
  /** Year for optimistic updates. Required for optimistic UI updates. */
  year?: number;
  /** Quarter for optimistic updates. Required for optimistic UI updates. */
  quarter?: number;
}

/**
 * Parameters for updating a daily goal's assigned day.
 *
 * @public
 */
export interface UpdateDailyGoalDayParams {
  /** ID of the goal to update */
  goalId: Id<'goals'>;
  /** Week number within the quarter (1-13) */
  weekNumber: number;
  /** New day of week assignment (1=Monday, 7=Sunday) */
  newDayOfWeek: DayOfWeek;
}

/**
 * Parameters for moving goals from one day to another.
 *
 * @public
 */
export interface MoveGoalsFromDayParams {
  /** Source date specification */
  from: {
    /** Source year */
    year: number;
    /** Source quarter (1-4) */
    quarter: number;
    /** Source week number (1-13) */
    weekNumber: number;
    /** Source day of week (1=Monday, 7=Sunday) */
    dayOfWeek: DayOfWeek;
  };
  /** Destination date specification */
  to: {
    /** Destination year */
    year: number;
    /** Destination quarter (1-4) */
    quarter: number;
    /** Destination week number (1-13) */
    weekNumber: number;
    /** Destination day of week (1=Monday, 7=Sunday) */
    dayOfWeek: DayOfWeek;
  };
  /** If true, returns what would be moved without actually moving. Defaults to false. */
  dryRun?: boolean;
  /** If true, only moves incomplete goals. Defaults to true. */
  moveOnlyIncomplete?: boolean;
}

/**
 * Return type of useGoalActions hook providing all goal mutation operations.
 *
 * @public
 */
export interface GoalActions {
  /** Creates a new quarterly goal */
  createQuarterlyGoal: (params: CreateQuarterlyGoalParams) => Promise<void>;
  /** Creates a new weekly goal under a quarterly goal */
  createWeeklyGoal: (params: CreateWeeklyGoalParams) => Promise<void>;
  /** Creates a new daily goal under a weekly goal */
  createDailyGoal: (params: CreateDailyGoalParams) => Promise<void>;
  /** Updates status flags (starred, pinned) for a quarterly goal */
  updateQuarterlyGoalStatus: (params: UpdateQuarterlyGoalStatusParams) => Promise<void>;
  /** Updates title, details, and metadata for a quarterly goal */
  updateQuarterlyGoalTitle: (params: UpdateQuarterlyGoalTitleParams) => Promise<void>;
  /** Deletes a goal and all its children */
  deleteGoal: (params: DeleteGoalParams) => Promise<void>;
  /** Toggles completion status of a goal with optimistic updates */
  toggleGoalCompletion: (params: ToggleGoalCompletionParams) => Promise<void>;
  /** Updates which day a daily goal is assigned to */
  updateDailyGoalDay: (params: UpdateDailyGoalDayParams) => Promise<void>;
  /** Moves all goals from one day to another day */
  moveGoalsFromDay: (params: MoveGoalsFromDayParams) => Promise<unknown>;
}

/**
 * Provides CRUD operations for goals with optimistic updates.
 * All mutations automatically include the user's session ID.
 *
 * @public
 *
 * @returns Object containing all goal mutation functions
 *
 * @example
 * ```typescript
 * const { createQuarterlyGoal, toggleGoalCompletion } = useGoalActions();
 *
 * // Create a new quarterly goal
 * await createQuarterlyGoal({
 *   title: 'Launch new feature',
 *   year: 2025,
 *   quarter: 1,
 *   weekNumber: 1,
 *   isPinned: true
 * });
 *
 * // Toggle completion with optimistic updates
 * await toggleGoalCompletion({
 *   goalId: 'abc123',
 *   weekNumber: 1,
 *   isComplete: true,
 *   year: 2025,
 *   quarter: 1
 * });
 * ```
 */
export const useGoalActions = (): GoalActions => {
  const { sessionId } = useSession();
  const createQuarterlyGoalMutation = useMutation(api.dashboard.createQuarterlyGoal);
  const createWeeklyGoalMutation = useMutation(api.dashboard.createWeeklyGoal);
  const createDailyGoalMutation = useMutation(api.dashboard.createDailyGoal);
  const updateQuarterlyGoalStatusMutation = useMutation(api.dashboard.updateQuarterlyGoalStatus);
  const updateQuarterlyGoalTitleMutation = useMutation(api.dashboard.updateQuarterlyGoalTitle);
  const deleteGoalMutation = useMutation(api.goal.deleteGoal);
  const toggleGoalCompletionMutation = useMutation(
    api.dashboard.toggleGoalCompletion
  ).withOptimisticUpdate((localStore, args) => {
    const {
      goalId,
      isComplete,
      updateChildren,
      weekNumber,
      sessionId: argsSessionId,
      year,
      quarter,
    } = args;

    // Skip optimistic update if year/quarter not provided
    if (year === undefined || quarter === undefined) {
      return;
    }

    // Get the week query from local store
    const weekQuery = localStore.getQuery(api.dashboard.getWeek, {
      sessionId: argsSessionId,
      year,
      quarter,
      weekNumber,
    });

    if (!weekQuery) {
      return;
    }

    /**
     * Recursively updates goal completion status in the hierarchical tree.
     *
     * @internal
     * @param goal - Goal node to update
     * @returns Updated goal node with new completion status
     */
    const updateGoalInHierarchy = (
      goal: (typeof weekQuery.tree.quarterlyGoals)[0]
    ): typeof goal => {
      let updated = { ...goal };

      // Update if this is the target goal
      if (goal._id === goalId) {
        updated = {
          ...updated,
          isComplete,
          completedAt: isComplete ? Date.now() : undefined,
        };
      }

      // Update if this is a child and we should update children
      if (updateChildren && goal.parentId === goalId) {
        updated = {
          ...updated,
          isComplete,
          completedAt: isComplete ? Date.now() : undefined,
        };
      }

      // Recursively update children
      if (goal.children && goal.children.length > 0) {
        updated = {
          ...updated,
          children: goal.children.map(updateGoalInHierarchy),
        };
      }

      return updated;
    };

    // Update allGoals flat array
    const updatedAllGoals = weekQuery.tree.allGoals.map((g) => {
      if (g._id === goalId) {
        return {
          ...g,
          isComplete,
          completedAt: isComplete ? Date.now() : undefined,
        };
      }
      if (updateChildren && g.parentId === goalId) {
        return {
          ...g,
          isComplete,
          completedAt: isComplete ? Date.now() : undefined,
        };
      }
      return g;
    });

    // Update hierarchical quarterly goals tree
    const updatedQuarterlyGoals = weekQuery.tree.quarterlyGoals.map(updateGoalInHierarchy);

    // Write updated query back to Convex local store for optimistic UI
    localStore.setQuery(
      api.dashboard.getWeek,
      {
        sessionId: argsSessionId,
        year,
        quarter,
        weekNumber,
      },
      {
        ...weekQuery,
        tree: {
          ...weekQuery.tree,
          allGoals: updatedAllGoals,
          quarterlyGoals: updatedQuarterlyGoals,
        },
      }
    );
  });
  const updateDailyGoalDayMutation = useMutation(api.dashboard.updateDailyGoalDay);
  const moveGoalsFromDayMutation = useMutation(api.goal.moveGoalsFromDay);

  return useMemo(
    () => ({
      createQuarterlyGoal: async (params: CreateQuarterlyGoalParams) => {
        const { title, details, dueDate, weekNumber, isPinned, isStarred, year, quarter } = params;
        await createQuarterlyGoalMutation({
          sessionId,
          year,
          quarter,
          weekNumber,
          title,
          details,
          dueDate,
          isPinned,
          isStarred,
        });
      },

      createWeeklyGoal: async (params: CreateWeeklyGoalParams) => {
        const { title, details, dueDate, parentId, weekNumber } = params;
        await createWeeklyGoalMutation({
          sessionId,
          title,
          details,
          dueDate,
          parentId,
          weekNumber,
        });
      },

      createDailyGoal: async (params: CreateDailyGoalParams) => {
        const { title, details, dueDate, parentId, weekNumber, dayOfWeek, dateTimestamp } = params;
        await createDailyGoalMutation({
          sessionId,
          title,
          details,
          dueDate,
          parentId,
          weekNumber,
          dayOfWeek,
          dateTimestamp,
        });
      },

      updateQuarterlyGoalStatus: async (params: UpdateQuarterlyGoalStatusParams) => {
        const { weekNumber, goalId, isStarred, isPinned, year, quarter } = params;
        await updateQuarterlyGoalStatusMutation({
          sessionId,
          year,
          quarter,
          weekNumber,
          goalId,
          isStarred,
          isPinned,
        });
      },

      updateQuarterlyGoalTitle: async (params: UpdateQuarterlyGoalTitleParams) => {
        const { goalId, title, details, dueDate, domainId } = params;
        await updateQuarterlyGoalTitleMutation({
          sessionId,
          goalId,
          title,
          details,
          dueDate,
          domainId: domainId ?? undefined,
        });
      },

      deleteGoal: async (params: DeleteGoalParams) => {
        const { goalId } = params;
        try {
          await deleteGoalMutation({
            sessionId,
            goalId,
          });
        } catch (error) {
          console.error('Failed to delete goal:', error);
          const errorData = parseConvexError(error);
          toast({
            variant: 'destructive',
            title: errorTitles[errorData.code],
            description: errorData.message,
          });
        }
      },

      toggleGoalCompletion: async (params: ToggleGoalCompletionParams) => {
        const { goalId, weekNumber, isComplete, updateChildren, year, quarter } = params;
        await toggleGoalCompletionMutation({
          sessionId,
          goalId,
          weekNumber,
          isComplete,
          updateChildren,
          year,
          quarter,
        });
      },

      updateDailyGoalDay: async (params: UpdateDailyGoalDayParams) => {
        const { goalId, weekNumber, newDayOfWeek } = params;
        await updateDailyGoalDayMutation({
          sessionId,
          goalId,
          weekNumber,
          newDayOfWeek,
        });
      },

      moveGoalsFromDay: async (params: MoveGoalsFromDayParams) => {
        const { from, to, dryRun, moveOnlyIncomplete = true } = params;
        const result = await moveGoalsFromDayMutation({
          sessionId,
          from,
          to,
          dryRun,
          moveOnlyIncomplete,
        });

        return result;
      },
    }),
    [
      sessionId,
      createQuarterlyGoalMutation,
      createWeeklyGoalMutation,
      createDailyGoalMutation,
      updateQuarterlyGoalStatusMutation,
      updateQuarterlyGoalTitleMutation,
      deleteGoalMutation,
      toggleGoalCompletionMutation,
      updateDailyGoalDayMutation,
      moveGoalsFromDayMutation,
    ]
  );
};
