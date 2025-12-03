import { api } from '@services/backend/convex/_generated/api';
import { DayOfWeek } from '@services/backend/src/constants';
import { getISOWeekYear } from '@services/backend/src/util/isoWeek';
import { useMutation } from 'convex/react';
import { DateTime } from 'luxon';
import { type ReactElement, useCallback, useState } from 'react';
import {
  type PreviewTask,
  TaskMovePreview,
  type TaskMovePreviewData,
} from '@/components/molecules/day-of-week/components/TaskMovePreview';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useCurrentDateInfo } from '@/hooks/useCurrentDateTime';
import { getDayName } from '@/lib/constants';
import { useSession } from '@/modules/auth/useSession';
import { useGoalActions } from './useGoalActions';

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
  const { moveAdhocGoalsFromDay } = useAdhocGoals(sessionId);
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
                id: 'adhoc',
                title: adhoc.domainName || 'Uncategorized',
              },
            }));
            allTasksFromPreviousWeek.push(...adhocTasks);
          }
        }
      }

      // Step 2: Preview goals from past days in current week → Today
      if (!isMonday) {
        const pastDays = getPastDaysOfWeek();
        const now = DateTime.now();
        const isoYear = getISOWeekYear(now.toJSDate());

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

          // Preview adhoc goals from this past day
          const adhocPreviewData = await moveAdhocGoalsFromDay(
            {
              year: isoYear,
              weekNumber,
              dayOfWeek: pastDay,
            },
            {
              year: isoYear,
              weekNumber,
              dayOfWeek: currentDayOfWeek,
            },
            true // dry-run
          );

          if ('canMove' in adhocPreviewData && adhocPreviewData.canMove && adhocPreviewData.goals) {
            const adhocTasks = adhocPreviewData.goals.map((goal) => ({
              id: goal._id,
              title: goal.title,
              details: goal.details,
              isComplete: goal.isComplete,
              quarterlyGoal: {
                id: 'adhoc',
                title: 'Adhoc Tasks',
                isStarred: false,
                isPinned: false,
              },
              weeklyGoal: {
                id: 'adhoc',
                title: goal.domain?.name || 'Uncategorized',
              },
            }));
            allTasksFromPastDays.push(...adhocTasks);
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
    moveAdhocGoalsFromDay,
  ]);

  /**
   * Execute the pull goals operation
   */
  const executePullGoals = useCallback(async () => {
    try {
      setIsPulling(true);
      let totalMoved = 0;

      // Step 1: Pull from last non-empty week → Monday
      // IMPORTANT: Only pull from previous weeks within the same quarter (not from previous quarter)
      if (!isFirstWeekOfQuarter) {
        const weekResult = await moveGoalsFromLastNonEmptyWeekMutation({
          sessionId,
          to: {
            quarter,
            weekNumber,
            year,
            dayOfWeek: DayOfWeek.MONDAY,
          },
          dryRun: false,
        });

        if ('dailyGoalsMoved' in weekResult) {
          totalMoved += weekResult.dailyGoalsMoved || 0;
          totalMoved += weekResult.adhocGoalsMoved || 0;
        }
      }

      // Step 2: Pull from past days → Today
      if (!isMonday) {
        const pastDays = getPastDaysOfWeek();
        const now = DateTime.now();
        const isoYear = getISOWeekYear(now.toJSDate());

        for (const pastDay of pastDays) {
          // Move regular goals
          const dayResult = await moveGoalsFromDay({
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

          if (dayResult && typeof dayResult === 'object' && 'tasksMoved' in dayResult) {
            totalMoved += (dayResult.tasksMoved as number) || 0;
          }

          // Move adhoc goals
          const adhocResult = await moveAdhocGoalsFromDay(
            {
              year: isoYear,
              weekNumber,
              dayOfWeek: pastDay,
            },
            {
              year: isoYear,
              weekNumber,
              dayOfWeek: currentDayOfWeek,
            },
            false // not dry-run
          );

          if (adhocResult && typeof adhocResult === 'object' && 'goalsMoved' in adhocResult) {
            totalMoved += (adhocResult.goalsMoved as number) || 0;
          }
        }
      }

      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Failed to pull goals:', error);
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
    moveAdhocGoalsFromDay,
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
