import { api } from '@services/backend/convex/_generated/api';
import type { Id } from '@services/backend/convex/_generated/dataModel';
import { errorTitles } from '@services/backend/errors';
import type { DayOfWeek } from '@services/backend/src/constants';
import { useMutation } from 'convex/react';
import { useMemo } from 'react';
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
  const toggleGoalCompletionMutation = useMutation(api.dashboard.toggleGoalCompletion);
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
          console.error(`Delete goal error [${errorTitles[errorData.code]}]: ${errorData.message}`);
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
