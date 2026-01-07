import { api } from '@workspace/backend/convex/_generated/api';
import { DayOfWeek } from '@workspace/backend/src/constants';
import { useMutation } from 'convex/react';
import { type ReactElement, useCallback, useState } from 'react';

import { useGoalActions } from './useGoalActions';

import {
  type PreviewTask,
  TaskMovePreview,
  type TaskMovePreviewData,
} from '@/components/molecules/day-of-week/components/TaskMovePreview';
import { toast } from '@/components/ui/use-toast';
import { useCurrentDateInfo } from '@/hooks/useCurrentDateTime';
import { getDayName } from '@/lib/constants';
import { useSession } from '@/modules/auth/useSession';

interface UsePullGoalsProps {
  weekNumber: number;
  year: number;
  quarter: number;
}

interface PullGoalsPreviewData {
  tasksFromPreviousWeek: PreviewTask[];
  tasksFromPastDays: PreviewTask[];
  totalTasks: number;
}

interface UsePullGoalsReturn {
  isPulling: boolean;
  hasPendingGoals: boolean;
  pendingGoalsCount: number;
  handlePullGoals: () => Promise<void>;
  dialog: ReactElement;
}

/**
 * Unified hook for pulling goals from:
 * 1. Last non-empty week → Monday of current week
 * 2. Past days of current week → Today
 *
 * This combines both operations into a single "Pull goals" action.
 */
export const usePullGoals = ({
  weekNumber,
  year,
  quarter,
}: UsePullGoalsProps): UsePullGoalsReturn => {
  const { sessionId } = useSession();
  const { moveGoalsFromDay } = useGoalActions();
  const moveGoalsFromLastNonEmptyWeekMutation = useMutation(api.goal.moveGoalsFromLastNonEmptyWeek);

  const [isPulling, setIsPulling] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [preview, setPreview] = useState<TaskMovePreviewData | null>(null);
  const [previewData, setPreviewData] = useState<PullGoalsPreviewData | null>(null);

  // Get current day info
  const { weekday: currentDayOfWeek } = useCurrentDateInfo();

  // Check if it's Monday (first day of week)
  const isMonday = currentDayOfWeek === DayOfWeek.MONDAY;

  // Check if it's the first week of the quarter (don't pull from previous quarter)
  const isFirstWeekOfQuarter = weekNumber === 1;

  // Get all past days of the current week (before today)
  const getPastDaysOfWeek = useCallback((): DayOfWeek[] => {
    const pastDays: DayOfWeek[] = [];
    for (let day = DayOfWeek.MONDAY; day < currentDayOfWeek; day++) {
      pastDays.push(day as DayOfWeek);
    }
    return pastDays;
  }, [currentDayOfWeek]);

  /**
   * Preview what goals would be pulled (dry-run)
   */
  const handlePreviewGoals = useCallback(async (): Promise<PullGoalsPreviewData | null> => {
    const allTasksFromPreviousWeek: PreviewTask[] = [];
    const allTasksFromPastDays: PreviewTask[] = [];

    try {
      // Step 1: Preview goals from last non-empty week → Monday
      // IMPORTANT: Only pull from previous weeks within the same quarter (not from previous quarter)
      if (!isFirstWeekOfQuarter) {
        const weekPreviewData = await moveGoalsFromLastNonEmptyWeekMutation({
          sessionId,
          to: {
            quarter,
            weekNumber,
            year,
            dayOfWeek: DayOfWeek.MONDAY, // Always pull to Monday first
          },
          dryRun: true,
        });

        if ('canPull' in weekPreviewData && weekPreviewData.canPull) {
          // Convert daily goals from week preview to PreviewTask format
          const weekTasks = weekPreviewData.dailyGoalsToMove.map((dailyGoal) => {
            const quarterlyStatus = weekPreviewData.quarterlyGoalsToUpdate.find(
              (q) => q.id === dailyGoal.quarterlyGoalId
            ) ?? { isStarred: false, isPinned: false };

            return {
              id: dailyGoal.id,
              title: dailyGoal.title,
              isComplete: false,
              quarterlyGoal: {
                id: dailyGoal.quarterlyGoalId ?? dailyGoal.weeklyGoalId,
                title: dailyGoal.quarterlyGoalTitle ?? dailyGoal.weeklyGoalTitle,
                isStarred: quarterlyStatus.isStarred,
                isPinned: quarterlyStatus.isPinned,
              },
              weeklyGoal: {
                id: dailyGoal.weeklyGoalId,
                title: dailyGoal.weeklyGoalTitle,
              },
            };
          });
          allTasksFromPreviousWeek.push(...weekTasks);

          // Also add adhoc goals from the preview
          if (weekPreviewData.adhocGoalsToMove && weekPreviewData.adhocGoalsToMove.length > 0) {
            const adhocTasks = weekPreviewData.adhocGoalsToMove.map((adhoc) => ({
              id: adhoc.id,
              title: adhoc.title,
              details: undefined,
              isComplete: false,
              quarterlyGoal: {
                id: 'adhoc',
                title: 'Adhoc Tasks',
                isStarred: false,
                isPinned: false,
              },
              weeklyGoal: {
                id: `adhoc-domain-${adhoc.domainId || 'uncategorized'}`,
                title: adhoc.domainName || 'Uncategorized',
              },
            }));
            allTasksFromPreviousWeek.push(...adhocTasks);
          }
        }
      }

      // Step 2: Preview goals from past days in current week → Today
      // NOTE: Adhoc goals are week-level (not day-level), so they don't need to be
      // "pulled" from past days - they're already in the current week.
      // Only regular daily goals need to be moved between days.
      if (!isMonday) {
        const pastDays = getPastDaysOfWeek();

        for (const pastDay of pastDays) {
          // Preview regular goals from this past day
          const dayPreviewData = await moveGoalsFromDay({
            from: {
              year,
              quarter,
              weekNumber,
              dayOfWeek: pastDay,
            },
            to: {
              year,
              quarter,
              weekNumber,
              dayOfWeek: currentDayOfWeek,
            },
            dryRun: true,
            moveOnlyIncomplete: true,
          });

          if (
            'canMove' in dayPreviewData &&
            dayPreviewData.canMove &&
            dayPreviewData.tasks.length > 0
          ) {
            allTasksFromPastDays.push(...dayPreviewData.tasks);
          }
        }
      }

      return {
        tasksFromPreviousWeek: allTasksFromPreviousWeek,
        tasksFromPastDays: allTasksFromPastDays,
        totalTasks: allTasksFromPreviousWeek.length + allTasksFromPastDays.length,
      };
    } catch (error) {
      console.error('Failed to preview goals:', error);
      return null;
    }
  }, [
    sessionId,
    quarter,
    weekNumber,
    year,
    isMonday,
    isFirstWeekOfQuarter,
    currentDayOfWeek,
    getPastDaysOfWeek,
    moveGoalsFromLastNonEmptyWeekMutation,
    moveGoalsFromDay,
  ]);

  /**
   * Execute the pull goals operation
   */
  const executePullGoals = useCallback(async () => {
    try {
      setIsPulling(true);

      // Step 1: Pull from last non-empty week → Monday
      // IMPORTANT: Only pull from previous weeks within the same quarter (not from previous quarter)
      if (!isFirstWeekOfQuarter) {
        await moveGoalsFromLastNonEmptyWeekMutation({
          sessionId,
          to: {
            quarter,
            weekNumber,
            year,
            dayOfWeek: DayOfWeek.MONDAY,
          },
          dryRun: false,
        });
      }

      // Step 2: Pull from past days → Today
      // NOTE: Adhoc goals are week-level, so they don't need day-to-day movement.
      // Only regular daily goals are moved between days.
      if (!isMonday) {
        const pastDays = getPastDaysOfWeek();

        for (const pastDay of pastDays) {
          // Move regular goals only
          await moveGoalsFromDay({
            from: {
              year,
              quarter,
              weekNumber,
              dayOfWeek: pastDay,
            },
            to: {
              year,
              quarter,
              weekNumber,
              dayOfWeek: currentDayOfWeek,
            },
            dryRun: false,
            moveOnlyIncomplete: true,
          });
        }
      }

      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Failed to pull goals:', error);
      toast({
        title: 'Error',
        description: 'Failed to pull goals.',
        variant: 'destructive',
      });
    } finally {
      setIsPulling(false);
    }
  }, [
    sessionId,
    quarter,
    weekNumber,
    year,
    isMonday,
    isFirstWeekOfQuarter,
    currentDayOfWeek,
    getPastDaysOfWeek,
    moveGoalsFromLastNonEmptyWeekMutation,
    moveGoalsFromDay,
  ]);

  /**
   * Main handler: Preview first, then show dialog
   */
  const handlePullGoals = useCallback(async () => {
    try {
      setIsPulling(true);
      const previewResult = await handlePreviewGoals();

      if (!previewResult || previewResult.totalTasks === 0) {
        return;
      }

      setPreviewData(previewResult);

      // Combine all tasks for the preview dialog
      const allTasks = [...previewResult.tasksFromPreviousWeek, ...previewResult.tasksFromPastDays];

      // Build description based on what's being pulled
      let previousDayDescription = '';
      if (
        previewResult.tasksFromPreviousWeek.length > 0 &&
        previewResult.tasksFromPastDays.length > 0
      ) {
        previousDayDescription = 'previous week and past days';
      } else if (previewResult.tasksFromPreviousWeek.length > 0) {
        previousDayDescription = 'previous week';
      } else {
        previousDayDescription = 'past days';
      }

      setPreview({
        previousDay: previousDayDescription,
        targetDay: getDayName(currentDayOfWeek),
        tasks: allTasks,
      });
      setShowConfirmDialog(true);
    } catch (error) {
      console.error('Failed to preview goals:', error);
      toast({
        title: 'Error',
        description: 'Failed to preview goals to pull.',
        variant: 'destructive',
      });
    } finally {
      setIsPulling(false);
    }
  }, [handlePreviewGoals, currentDayOfWeek]);

  return {
    isPulling,
    hasPendingGoals: (previewData?.totalTasks ?? 0) > 0,
    pendingGoalsCount: previewData?.totalTasks ?? 0,
    handlePullGoals,
    dialog: (
      <TaskMovePreview
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        preview={preview}
        onConfirm={executePullGoals}
      />
    ),
  };
};
