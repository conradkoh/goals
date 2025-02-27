import { useState } from 'react';
import type { ReactElement } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@services/backend/convex/_generated/api';
import { useSession } from '@/modules/auth/useSession';
import { toast } from '@/components/ui/use-toast';
import { WeekCardPreviewDialog } from '@/components/design/quarterly-overview/week-card-sections/WeekCardPreviewDialog';
import { Id } from '@services/backend/convex/_generated/dataModel';

interface PreviewTask {
  id: string;
  title: string;
  details?: string;
  quarterlyGoal: {
    id: string;
    title: string;
    isStarred?: boolean;
    isPinned?: boolean;
  };
  weeklyGoal: {
    id: string;
    title: string;
  };
}

interface WeeklyGoalToCopy {
  title: string;
  carryOver: {
    type: 'week';
    numWeeks: number;
    fromGoal: {
      previousGoalId: Id<'goals'>;
      rootGoalId: Id<'goals'>;
    };
  };
  dailyGoalsCount: number;
  quarterlyGoalId?: Id<'goals'>;
}

interface UseMoveGoalsForWeekProps {
  weekNumber: number;
  year: number;
  quarter: number;
}

interface UseMoveGoalsForWeekReturn {
  isFirstWeek: boolean;
  isMovingTasks: boolean;
  handlePreviewTasks: () => Promise<void>;
  dialog: ReactElement;
}

export const useMoveGoalsForWeek = ({
  weekNumber,
  year,
  quarter,
}: UseMoveGoalsForWeekProps): UseMoveGoalsForWeekReturn => {
  const { sessionId } = useSession();
  const moveGoalsFromWeekMutation = useMutation(api.goal.moveGoalsFromWeek);
  const [isMovingTasks, setIsMovingTasks] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [preview, setPreview] = useState<{
    tasks: Array<PreviewTask>;
    weeklyGoals: Array<WeeklyGoalToCopy>;
  } | null>(null);

  const isFirstWeek = weekNumber === 1; // First week of the quarter

  const handlePreviewTasks = async () => {
    if (isFirstWeek) return;
    try {
      const previewData = await moveGoalsFromWeekMutation({
        sessionId,
        from: {
          quarter,
          weekNumber: weekNumber - 1,
          year,
        },
        to: {
          quarter,
          weekNumber,
          year,
        },
        dryRun: true,
      });

      // Type guard to check if we have preview data
      if ('canPull' in previewData && previewData.canPull) {
        // Map the daily goals to the PreviewTask format
        setPreview({
          tasks: previewData.dailyGoalsToMove.map((dailyGoal) => {
            // Find the quarterly goal status
            const quarterlyStatus = previewData.quarterlyGoalsToUpdate.find(
              (q) => q.id === dailyGoal.quarterlyGoalId
            ) ?? { isStarred: false, isPinned: false };

            return {
              id: dailyGoal.id,
              title: dailyGoal.title,
              weeklyGoal: {
                id: dailyGoal.weeklyGoalId,
                title: dailyGoal.weeklyGoalTitle,
              },
              quarterlyGoal: {
                id: dailyGoal.quarterlyGoalId!,
                title: dailyGoal.quarterlyGoalTitle!,
                isStarred: quarterlyStatus.isStarred,
                isPinned: quarterlyStatus.isPinned,
              },
            };
          }),
          weeklyGoals: previewData.weekStatesToCopy,
        });
        setShowConfirmDialog(true);
      }
    } catch (error) {
      console.error('Failed to preview tasks:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to preview tasks to move.',
      });
    }
  };

  const handleMoveTasks = async () => {
    if (isFirstWeek) return;
    try {
      setIsMovingTasks(true);
      await moveGoalsFromWeekMutation({
        sessionId,
        from: {
          quarter,
          weekNumber: weekNumber - 1,
          year,
        },
        to: {
          quarter,
          weekNumber,
          year,
        },
        dryRun: false,
      });
      setShowConfirmDialog(false);
      toast({
        title: 'Success',
        description: 'Successfully moved tasks from previous week.',
      });
    } catch (error) {
      console.error('Failed to move tasks:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to move tasks from previous week.',
      });
    } finally {
      setIsMovingTasks(false);
    }
  };

  return {
    isFirstWeek,
    isMovingTasks,
    handlePreviewTasks,
    dialog: (
      <WeekCardPreviewDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        preview={preview}
        onMoveTasks={handleMoveTasks}
      />
    ),
  };
};
