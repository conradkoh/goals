import { useMutation } from 'convex/react';
import { api } from '@services/backend/convex/_generated/api';
import { useSession } from '@/modules/auth/useSession';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { DayOfWeek } from '@services/backend/src/constants';
import { useMemo } from 'react';

export const useGoalActions = () => {
  const { sessionId } = useSession();
  const createQuarterlyGoalMutation = useMutation(
    api.dashboard.createQuarterlyGoal
  );
  const createWeeklyGoalMutation = useMutation(api.dashboard.createWeeklyGoal);
  const createDailyGoalMutation = useMutation(api.dashboard.createDailyGoal);
  const updateQuarterlyGoalStatusMutation = useMutation(
    api.dashboard.updateQuarterlyGoalStatus
  );
  const updateQuarterlyGoalTitleMutation = useMutation(
    api.dashboard.updateQuarterlyGoalTitle
  );
  const deleteQuarterlyGoalMutation = useMutation(
    api.dashboard.deleteQuarterlyGoal
  );
  const toggleGoalCompletionMutation = useMutation(
    api.dashboard.toggleGoalCompletion
  );
  const updateDailyGoalDayMutation = useMutation(
    api.dashboard.updateDailyGoalDay
  );
  const moveIncompleteTasksFromPreviousDayMutation = useMutation(
    api.dashboard.moveIncompleteTasksFromPreviousDay
  );

  return useMemo(
    () => ({
      createQuarterlyGoal: async ({
        title,
        details,
        weekNumber,
        isPinned,
        isStarred,
        year,
        quarter,
      }: {
        title: string;
        details?: string;
        weekNumber: number;
        isPinned?: boolean;
        isStarred?: boolean;
        year: number;
        quarter: number;
      }) => {
        await createQuarterlyGoalMutation({
          sessionId,
          year,
          quarter,
          weekNumber,
          title,
          details,
          isPinned,
          isStarred,
        });
      },

      createWeeklyGoal: async ({
        title,
        details,
        parentId,
        weekNumber,
      }: {
        title: string;
        details?: string;
        parentId: Id<'goals'>;
        weekNumber: number;
      }) => {
        await createWeeklyGoalMutation({
          sessionId,
          title,
          details,
          parentId,
          weekNumber,
        });
      },

      createDailyGoal: async ({
        title,
        details,
        parentId,
        weekNumber,
        dayOfWeek,
        dateTimestamp,
      }: {
        title: string;
        details?: string;
        parentId: Id<'goals'>;
        weekNumber: number;
        dayOfWeek: DayOfWeek;
        dateTimestamp?: number;
      }) => {
        await createDailyGoalMutation({
          sessionId,
          title,
          details,
          parentId,
          weekNumber,
          dayOfWeek,
          dateTimestamp,
        });
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
      }: {
        goalId: Id<'goals'>;
        title: string;
        details?: string;
      }) => {
        await updateQuarterlyGoalTitleMutation({
          sessionId,
          goalId,
          title,
          details,
        });
      },

      deleteQuarterlyGoal: async ({ goalId }: { goalId: Id<'goals'> }) => {
        await deleteQuarterlyGoalMutation({
          sessionId,
          goalId,
        });
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

      moveIncompleteTasksFromPreviousDay: async ({
        weekNumber,
        targetDayOfWeek,
        year,
        quarter,
        dryRun,
      }: {
        weekNumber: number;
        targetDayOfWeek: DayOfWeek;
        year: number;
        quarter: number;
        dryRun?: boolean;
      }) => {
        const result = await moveIncompleteTasksFromPreviousDayMutation({
          sessionId,
          year,
          quarter,
          weekNumber,
          targetDayOfWeek,
          dryRun,
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
      deleteQuarterlyGoalMutation,
      toggleGoalCompletionMutation,
      updateDailyGoalDayMutation,
      moveIncompleteTasksFromPreviousDayMutation,
    ]
  );
};
