import { api } from '@services/backend/convex/_generated/api';
import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { DayOfWeek } from '@services/backend/src/constants';
import { useMutation } from 'convex/react';
import { type ReactElement, useState } from 'react';
import { WeekCardPreviewDialog } from '@/components/organisms/WeekCardPreviewDialog';
import { toast } from '@/components/ui/use-toast';
import { useSession } from '@/modules/auth/useSession';

// Match the types expected by WeekCardPreviewDialog
interface DailyGoalToCopy {
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
    consolidateToDayOfWeek?: DayOfWeek;
  };
}

interface WeekStateToCopy {
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
  handlePreviewTasks: (targetDayOfWeek?: DayOfWeek) => Promise<void>;
  dialog: ReactElement;
}

export const useMoveGoalsForWeek = ({
  weekNumber,
  year,
  quarter,
}: UseMoveGoalsForWeekProps): UseMoveGoalsForWeekReturn => {
  const { sessionId } = useSession();
  const moveGoalsFromLastNonEmptyWeekMutation = useMutation(api.goal.moveGoalsFromLastNonEmptyWeek);
  const [isMovingTasks, setIsMovingTasks] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [preview, setPreview] = useState<{
    tasks: DailyGoalToCopy[];
    weeklyGoals: WeekStateToCopy[];
    quarterlyGoals: {
      id: string;
      title: string;
      isStarred?: boolean;
      isPinned?: boolean;
    }[];
  } | null>(null);
  const [targetDayOfWeek, setTargetDayOfWeek] = useState<DayOfWeek | undefined>(undefined);

  const isFirstWeek = weekNumber === 1;

  const handlePreviewTasks = async (dayOfWeek?: DayOfWeek) => {
    if (isFirstWeek) return;
    try {
      // Store the target day of week for use in the actual move operation
      setTargetDayOfWeek(dayOfWeek);

      const previewData = await moveGoalsFromLastNonEmptyWeekMutation({
        sessionId,
        to: {
          quarter,
          weekNumber,
          year,
          ...(dayOfWeek !== undefined && { dayOfWeek }),
        },
        dryRun: true,
      });

      // Type guard to check if we have preview data
      if ('canPull' in previewData && previewData.canPull) {
        // Map the daily goals to the DailyGoalToCopy format
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
                consolidateToDayOfWeek: dayOfWeek,
              },
              quarterlyGoal: {
                id: dailyGoal.quarterlyGoalId ?? dailyGoal.weeklyGoalId,
                title: dailyGoal.quarterlyGoalTitle ?? dailyGoal.weeklyGoalTitle,
                isStarred: quarterlyStatus.isStarred,
                isPinned: quarterlyStatus.isPinned,
              },
            };
          }),
          weeklyGoals: previewData.weekStatesToCopy,
          quarterlyGoals: previewData.quarterlyGoalsToUpdate.map((q) => ({
            id: q.id,
            title: q.title,
            isStarred: q.isStarred,
            isPinned: q.isPinned,
          })),
        });
        setShowConfirmDialog(true);
      }
    } catch (error) {
      console.error('Failed to preview tasks:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to preview tasks from last non-empty week.',
      });
    }
  };

  const handleMoveTasks = async () => {
    if (isFirstWeek) return;
    try {
      setIsMovingTasks(true);
      await moveGoalsFromLastNonEmptyWeekMutation({
        sessionId,
        to: {
          quarter,
          weekNumber,
          year,
          ...(targetDayOfWeek !== undefined && { dayOfWeek: targetDayOfWeek }),
        },
        dryRun: false,
      });
      setShowConfirmDialog(false);
      toast({
        title: 'Success',
        description: 'Successfully moved tasks from last non-empty week.',
      });
    } catch (error) {
      console.error('Failed to move tasks:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to move tasks from last non-empty week.',
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
