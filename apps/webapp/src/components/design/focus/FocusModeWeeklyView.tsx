import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { WeekCardDailyGoals } from '../quarterly-overview/week-card-sections/WeekCardDailyGoals';
import { WeekCardQuarterlyGoals } from '../quarterly-overview/week-card-sections/WeekCardQuarterlyGoals';
import { WeekCardWeeklyGoals } from '../quarterly-overview/week-card-sections/WeekCardWeeklyGoals';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { useState } from 'react';
import { useSession } from '@/modules/auth/useSession';
import { useMutation } from 'convex/react';
import { api } from '@services/backend/convex/_generated/api';
import { toast } from '@/components/ui/use-toast';
import { WeekCardPreviewDialog } from '../quarterly-overview/week-card-sections/WeekCardPreviewDialog';

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

interface FocusModeWeeklyViewProps {
  weekNumber: number;
  year: number;
  quarter: number;
  weekData: WeekData;
  onNavigate: (weekNumber: number) => void;
}

export const FocusModeWeeklyView = ({
  weekNumber,
  year,
  quarter,
  weekData,
}: FocusModeWeeklyViewProps) => {
  const { sessionId } = useSession();
  const moveGoalsFromWeekMutation = useMutation(api.goal.moveGoalsFromWeek);
  const [isMovingTasks, setIsMovingTasks] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [preview, setPreview] = useState<{
    tasks: Array<PreviewTask>;
  } | null>(null);

  const isFirstWeek = weekNumber === 1; // First week of the quarter
  const isDisabled = isFirstWeek || isMovingTasks;

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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="font-semibold">💭 Quarterly Goals</div>
          {!isFirstWeek && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviewTasks}
              disabled={isDisabled}
              className="text-muted-foreground hover:text-foreground"
            >
              <History className="h-4 w-4 mr-2" />
              Pull from Previous Week
            </Button>
          )}
        </div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          <WeekCardQuarterlyGoals
            weekNumber={weekNumber}
            year={year}
            quarter={quarter}
          />
        </WeekProviderWithoutDashboard>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="font-semibold mb-4">🚀 Weekly Goals</div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          <WeekCardWeeklyGoals
            weekNumber={weekNumber}
            year={year}
            quarter={quarter}
          />
        </WeekProviderWithoutDashboard>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="font-semibold mb-4">🔍 Daily Goals</div>
        <WeekProviderWithoutDashboard weekData={weekData}>
          <WeekCardDailyGoals
            weekNumber={weekNumber}
            year={year}
            quarter={quarter}
          />
        </WeekProviderWithoutDashboard>
      </div>

      <WeekCardPreviewDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        preview={preview}
        onMoveTasks={handleMoveTasks}
      />
    </div>
  );
};
