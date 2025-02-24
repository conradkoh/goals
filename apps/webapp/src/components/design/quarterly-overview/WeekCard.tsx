import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Focus, History, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { api } from '@services/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { useSession } from '@/modules/auth/useSession';
import { WeekCardPreviewDialog } from './week-card-sections/WeekCardPreviewDialog';

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

interface WeekCardProps {
  weekLabel: string;
  mondayDate: string;
  weekNumber: number;
  isCurrentWeek?: boolean;
  children?: React.ReactNode;
  onFocusClick?: () => void;
  weekData: WeekData;
  year: number;
  quarter: number;
}

export const WeekCard = ({
  weekLabel,
  mondayDate,
  weekNumber,
  isCurrentWeek,
  children,
  onFocusClick,
  weekData,
  year,
  quarter,
}: WeekCardProps) => {
  const { sessionId } = useSession();
  const moveGoalsFromWeekMutation = useMutation(api.goal.moveGoalsFromWeek);
  const [isMovingTasks, setIsMovingTasks] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [preview, setPreview] = useState<{
    tasks: Array<PreviewTask>;
  } | null>(null);

  const isFirstWeek = weekNumber === 1; // First week of the quarter
  const isDisabled = isFirstWeek || isMovingTasks;
  const tooltipContent = isFirstWeek
    ? 'Cannot pull goals from previous week as this is the first week of the quarter'
    : isMovingTasks
    ? 'Moving tasks...'
    : null;

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
    <WeekProviderWithoutDashboard weekData={weekData}>
      <div
        className={cn(
          'h-full flex flex-col border rounded-lg shadow bg-white',
          isCurrentWeek && 'ring-2 ring-blue-500'
        )}
      >
        <div
          className={cn(
            'border-b p-4 flex-shrink-0',
            isCurrentWeek && 'bg-blue-50'
          )}
        >
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className="font-semibold">{weekLabel}</h3>
              <span className="text-sm text-gray-500">{mondayDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onFocusClick}
                title="Focus Mode"
              >
                <Focus className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isDisabled ? (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full cursor-not-allowed">
                            <DropdownMenuItem
                              className="cursor-not-allowed opacity-50"
                              disabled
                            >
                              <History className="mr-2 h-4 w-4" />
                              <div className="flex flex-col w-full items-center">
                                <span>Pull Incomplete</span>
                                <span className="text-gray-500 text-xs">
                                  from previous week
                                </span>
                              </div>
                            </DropdownMenuItem>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tooltipContent}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={handlePreviewTasks}
                    >
                      <History className="mr-2 h-4 w-4" />
                      <div className="flex flex-col w-full items-center">
                        <span>Pull Incomplete</span>
                        <span className="text-gray-500 text-xs">
                          from previous week
                        </span>
                      </div>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-6 min-h-0">{children}</div>
      </div>

      <WeekCardPreviewDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        preview={preview}
        onMoveTasks={handleMoveTasks}
      />
    </WeekProviderWithoutDashboard>
  );
};
