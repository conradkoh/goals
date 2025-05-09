import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, DayOfWeekType, getDayName } from '@/lib/constants';
import { History, CalendarDays } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { TaskMovePreview } from './TaskMovePreview';
import { toast } from '@/components/ui/use-toast';

interface DayHeaderProps {
  dayOfWeek: DayOfWeek;
  weekNumber: number;
  dateTimestamp: number;
}

export const DayHeader = ({
  dayOfWeek,
  weekNumber,
  dateTimestamp,
}: DayHeaderProps) => {
  const { moveGoalsFromDay } = useWeek();
  const [isMovingTasks, setIsMovingTasks] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [preview, setPreview] = useState<{
    previousDay: string;
    targetDay: string;
    tasks: Array<{
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
    }>;
  } | null>(null);
  const [isPullingFromAllPastDays, setIsPullingFromAllPastDays] = useState(false);

  const isMonday = dayOfWeek === DayOfWeek.MONDAY;
  const isDisabled = isMovingTasks || isMonday;

  // Get previous day of week
  const getPreviousDayOfWeek = (currentDay: DayOfWeek): DayOfWeek => {
    switch (currentDay) {
      case DayOfWeek.TUESDAY:
        return DayOfWeek.MONDAY;
      case DayOfWeek.WEDNESDAY:
        return DayOfWeek.TUESDAY;
      case DayOfWeek.THURSDAY:
        return DayOfWeek.WEDNESDAY;
      case DayOfWeek.FRIDAY:
        return DayOfWeek.THURSDAY;
      case DayOfWeek.SATURDAY:
        return DayOfWeek.FRIDAY;
      case DayOfWeek.SUNDAY:
        return DayOfWeek.SATURDAY;
      default:
        return DayOfWeek.SUNDAY; // This shouldn't happen for Monday
    }
  };

  // Get all past days in the week
  const getAllPastDaysOfWeek = (currentDay: DayOfWeek): DayOfWeek[] => {
    const pastDays: DayOfWeek[] = [];
    let day = currentDay;
    
    while (day > DayOfWeek.MONDAY) {
      const previousDay = getPreviousDayOfWeek(day);
      pastDays.push(previousDay);
      day = previousDay;
    }
    
    return pastDays;
  };

  // Format the date string
  const formattedDate = DateTime.fromMillis(dateTimestamp).toFormat('MMM d');

  const handlePreviewTasks = async (fromAllPastDays = false) => {
    if (isMonday) return;
    
    setIsPullingFromAllPastDays(fromAllPastDays);
    
    try {
      const year = DateTime.fromMillis(dateTimestamp).year;
      const quarter = Math.ceil(DateTime.fromMillis(dateTimestamp).month / 3);
      
      if (fromAllPastDays) {
        // Get all past days in the week
        const pastDays = getAllPastDaysOfWeek(dayOfWeek);
        let allTasks: any[] = [];
        let hasAnyTasks = false;
        
        // Preview tasks from each past day
        for (const pastDay of pastDays) {
          const previewData = await moveGoalsFromDay({
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
              dayOfWeek,
            },
            dryRun: true,
            moveOnlyIncomplete: true,
          });
          
          if ('canMove' in previewData && previewData.canMove && previewData.tasks.length > 0) {
            allTasks = [...allTasks, ...previewData.tasks];
            hasAnyTasks = true;
          }
        }
        
        if (hasAnyTasks) {
          setPreview({
            previousDay: "all past days",
            targetDay: getDayName(dayOfWeek),
            tasks: allTasks,
          });
          setShowConfirmDialog(true);
        } else {
          toast({
            title: 'Cannot move tasks',
            description: 'No incomplete tasks to move from previous days',
            variant: 'default',
          });
        }
      } else {
        // Original functionality for single previous day
        const previousDayOfWeek = getPreviousDayOfWeek(dayOfWeek);
        
        const previewData = await moveGoalsFromDay({
          from: {
            year,
            quarter,
            weekNumber,
            dayOfWeek: previousDayOfWeek,
          },
          to: {
            year,
            quarter,
            weekNumber,
            dayOfWeek,
          },
          dryRun: true,
          moveOnlyIncomplete: true,
        });

        // Check if we have preview data
        if ('canMove' in previewData && previewData.canMove) {
          setPreview({
            previousDay: previewData.sourceDay.name,
            targetDay: previewData.targetDay.name,
            tasks: previewData.tasks,
          });
          setShowConfirmDialog(true);
        } else if (!('canMove' in previewData) || !previewData.canMove) {
          toast({
            title: 'Cannot move tasks',
            description: 'No incomplete tasks to move',
            variant: 'default',
          });
        }
      }
    } catch (error) {
      console.error('Failed to preview tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to preview tasks to move.',
        variant: 'destructive',
      });
    }
  };

  const handleMoveTasksFromPreviousDay = async () => {
    if (isMonday) return;
    try {
      setIsMovingTasks(true);
      const year = DateTime.fromMillis(dateTimestamp).year;
      const quarter = Math.ceil(DateTime.fromMillis(dateTimestamp).month / 3);
      
      if (isPullingFromAllPastDays) {
        // Handle pulling from all past days
        const pastDays = getAllPastDaysOfWeek(dayOfWeek);
        let totalTasksMoved = 0;
        
        // Move tasks from each past day
        for (const pastDay of pastDays) {
          const result = await moveGoalsFromDay({
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
              dayOfWeek,
            },
            dryRun: false,
            moveOnlyIncomplete: true,
          });
          
          if (result && typeof result === 'object' && 'tasksMoved' in result && typeof result.tasksMoved === 'number') {
            totalTasksMoved += result.tasksMoved;
          }
        }
        
        setShowConfirmDialog(false);
        toast({
          title: 'Tasks moved',
          description: `Moved ${totalTasksMoved} incomplete tasks from all previous days to ${getDayName(dayOfWeek)}.`,
          variant: 'default',
        });
      } else {
        // Original functionality for single previous day
        const previousDayOfWeek = getPreviousDayOfWeek(dayOfWeek);

        await moveGoalsFromDay({
          from: {
            year,
            quarter,
            weekNumber,
            dayOfWeek: previousDayOfWeek,
          },
          to: {
            year,
            quarter,
            weekNumber,
            dayOfWeek,
          },
          dryRun: false,
          moveOnlyIncomplete: true,
        });

        setShowConfirmDialog(false);
        toast({
          title: 'Tasks moved',
          description: `Moved incomplete tasks from ${getDayName(
            previousDayOfWeek
          )} to ${getDayName(dayOfWeek)}.`,
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Failed to move tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to move tasks.',
        variant: 'destructive',
      });
    } finally {
      setIsMovingTasks(false);
    }
  };

  const getTooltipContent = () => {
    if (isMonday) {
      return 'Cannot pull tasks to Monday as it is the first day of the week';
    }
    if (isMovingTasks) {
      return 'Moving tasks...';
    }
    return null;
  };

  const tooltipContent = getTooltipContent();

  return (
    <>
      <div className="space-y-2">
        <div className="bg-gray-100 py-1 px-3 rounded-md">
          <div className="flex items-center justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="p-0 h-auto hover:bg-transparent font-bold text-gray-900 text-sm w-full cursor-pointer flex items-center gap-2">
                  <span>{getDayName(dayOfWeek)}</span>
                  <span className="text-gray-500 font-normal">
                    {formattedDate}
                  </span>
                </div>
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
                                from previous day
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
                  <>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => handlePreviewTasks(false)}
                    >
                      <History className="mr-2 h-4 w-4" />
                      <div className="flex flex-col w-full items-center">
                        <span>Pull Incomplete</span>
                        <span className="text-gray-500 text-xs">
                          from previous day
                        </span>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => handlePreviewTasks(true)}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      <div className="flex flex-col w-full items-center">
                        <span>Pull Incomplete</span>
                        <span className="text-gray-500 text-xs">
                          from all past days in week
                        </span>
                      </div>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <TaskMovePreview
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        preview={preview}
        onConfirm={handleMoveTasksFromPreviousDay}
      />
    </>
  );
};
