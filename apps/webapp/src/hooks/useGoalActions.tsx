import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { errorTitles } from '@workspace/backend/errors';
import type { DayOfWeek } from '@workspace/backend/src/constants';
import { useMutation } from 'convex/react';
import { useMemo } from 'react';

import { toast } from '@/components/ui/use-toast';
import { parseConvexError } from '@/lib/error';
import { useSession } from '@/modules/auth/useSession';

export const useGoalActions = () => {
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
    const { goalId, isComplete, updateChildren, weekNumber, sessionId: argsSessionId } = args;
    // Type assertion for new optional params until types regenerate
    // biome-ignore lint/suspicious/noExplicitAny: Convex types need regeneration after schema update
    const year = (args as any).year as number | undefined;
    // biome-ignore lint/suspicious/noExplicitAny: Convex types need regeneration after schema update
    const quarter = (args as any).quarter as number | undefined;

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
      // Query not in cache, skip optimistic update
      return;
    }

    // Helper to recursively update goals in the hierarchy
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

    // Update allGoals array
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

    // Update hierarchical quarterly goals
    const updatedQuarterlyGoals = weekQuery.tree.quarterlyGoals.map(updateGoalInHierarchy);

    // Write updated query back to store
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
      createQuarterlyGoal: async ({
        title,
        details,
        dueDate,
        weekNumber,
        isPinned,
        isStarred,
        year,
        quarter,
      }: {
        title: string;
        details?: string;
        dueDate?: number;
        weekNumber: number;
        isPinned?: boolean;
        isStarred?: boolean;
        year: number;
        quarter: number;
      }) => {
        console.log('[useGoalActions] createQuarterlyGoal called:', {
          title,
          hasDetails: !!details,
          hasDueDate: dueDate !== undefined,
          dueDate,
          dueDateFormatted: dueDate ? new Date(dueDate).toISOString() : undefined,
          weekNumber,
          year,
          quarter,
        });
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
          // biome-ignore lint/suspicious/noExplicitAny: Convex types need regeneration after schema update
        } as any);
        console.log('[useGoalActions] createQuarterlyGoal completed');
      },

      createWeeklyGoal: async ({
        title,
        details,
        dueDate,
        parentId,
        weekNumber,
      }: {
        title: string;
        details?: string;
        dueDate?: number;
        parentId: Id<'goals'>;
        weekNumber: number;
      }) => {
        console.log('[useGoalActions] createWeeklyGoal called:', {
          title,
          hasDetails: !!details,
          hasDueDate: dueDate !== undefined,
          dueDate,
          dueDateFormatted: dueDate ? new Date(dueDate).toISOString() : undefined,
          parentId,
          weekNumber,
        });
        await createWeeklyGoalMutation({
          sessionId,
          title,
          details,
          dueDate,
          parentId,
          weekNumber,
          // biome-ignore lint/suspicious/noExplicitAny: Convex types need regeneration after schema update
        } as any);
        console.log('[useGoalActions] createWeeklyGoal completed');
      },

      createDailyGoal: async ({
        title,
        details,
        dueDate,
        parentId,
        weekNumber,
        dayOfWeek,
        dateTimestamp,
      }: {
        title: string;
        details?: string;
        dueDate?: number;
        parentId: Id<'goals'>;
        weekNumber: number;
        dayOfWeek: DayOfWeek;
        dateTimestamp?: number;
      }) => {
        console.log('[useGoalActions] createDailyGoal called:', {
          title,
          hasDetails: !!details,
          hasDueDate: dueDate !== undefined,
          dueDate,
          dueDateFormatted: dueDate ? new Date(dueDate).toISOString() : undefined,
          parentId,
          weekNumber,
          dayOfWeek,
        });
        await createDailyGoalMutation({
          sessionId,
          title,
          details,
          dueDate,
          parentId,
          weekNumber,
          dayOfWeek,
          dateTimestamp,
          // biome-ignore lint/suspicious/noExplicitAny: Convex types need regeneration after schema update
        } as any);
        console.log('[useGoalActions] createDailyGoal completed');
      },

      updateQuarterlyGoalStatus: async ({
        weekNumber,
        goalId,
        isStarred,
        isPinned,
        year,
        quarter,
      }: {
        weekNumber: number;
        goalId: Id<'goals'>;
        isStarred: boolean;
        isPinned: boolean;
        year: number;
        quarter: number;
      }) => {
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

      updateQuarterlyGoalTitle: async ({
        goalId,
        title,
        details,
        dueDate,
        domainId,
      }: {
        goalId: Id<'goals'>;
        title: string;
        details?: string;
        dueDate?: number;
        domainId?: Id<'domains'> | null;
      }) => {
        console.log('[useGoalActions] updateQuarterlyGoalTitle called:', {
          goalId,
          title,
          hasDetails: !!details,
          detailsLength: details?.length,
          hasDueDate: dueDate !== undefined,
          dueDate,
          dueDateFormatted: dueDate ? new Date(dueDate).toISOString() : undefined,
          hasDomainId: domainId !== undefined,
          domainId,
        });
        await updateQuarterlyGoalTitleMutation({
          sessionId,
          goalId,
          title,
          details,
          dueDate,
          domainId,
          // biome-ignore lint/suspicious/noExplicitAny: Convex types need regeneration after schema update
        } as any);
        console.log('[useGoalActions] updateQuarterlyGoalTitle completed');
      },

      deleteGoal: async ({ goalId }: { goalId: Id<'goals'> }) => {
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

      toggleGoalCompletion: async ({
        goalId,
        weekNumber,
        isComplete,
        updateChildren,
      }: {
        goalId: Id<'goals'>;
        weekNumber: number;
        isComplete: boolean;
        updateChildren?: boolean;
      }) => {
        await toggleGoalCompletionMutation({
          sessionId,
          goalId,
          weekNumber,
          isComplete,
          updateChildren,
        });
      },

      updateDailyGoalDay: async ({
        goalId,
        weekNumber,
        newDayOfWeek,
      }: {
        goalId: Id<'goals'>;
        weekNumber: number;
        newDayOfWeek: DayOfWeek;
      }) => {
        await updateDailyGoalDayMutation({
          sessionId,
          goalId,
          weekNumber,
          newDayOfWeek,
        });
      },

      moveGoalsFromDay: async ({
        from,
        to,
        dryRun,
        moveOnlyIncomplete = true,
      }: {
        from: {
          year: number;
          quarter: number;
          weekNumber: number;
          dayOfWeek: DayOfWeek;
        };
        to: {
          year: number;
          quarter: number;
          weekNumber: number;
          dayOfWeek: DayOfWeek;
        };
        dryRun?: boolean;
        moveOnlyIncomplete?: boolean;
      }) => {
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
