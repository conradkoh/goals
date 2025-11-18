import { getISOWeekYear } from '@services/backend/src/util/isoWeek';
import { CalendarDays, History, MoreVertical } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCallback, useMemo, useState } from 'react';
import {
  type PreviewTask,
  TaskMovePreview,
  type TaskMovePreviewData,
} from '@/components/molecules/day-of-week/components/TaskMovePreview';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, getDayName } from '@/lib/constants';
import { useSession } from '@/modules/auth/useSession';

interface TaskPullActionMenuProps {
  dayOfWeek: DayOfWeek;
  weekNumber: number;
  dateTimestamp: number;
}

export const TaskPullActionMenu = ({
  dayOfWeek,
  weekNumber,
  dateTimestamp,
}: TaskPullActionMenuProps) => {
  const { sessionId } = useSession();
  const { moveGoalsFromDay } = useWeek();
  const { moveAdhocGoalsFromDay } = useAdhocGoals(sessionId);
  const [isMovingTasks, setIsMovingTasks] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [preview, setPreview] = useState<TaskMovePreviewData | null>(null);
  const [isPullingFromAllPastDays, setIsPullingFromAllPastDays] = useState(false);

  // Memoize computed values that depend on props
  const isMonday = useMemo(() => dayOfWeek === DayOfWeek.MONDAY, [dayOfWeek]);
  const isDisabled = useMemo(() => isMovingTasks || isMonday, [isMovingTasks, isMonday]);

  // Memoize date calculations
  const dateCalculations = useMemo(() => {
    const year = DateTime.fromMillis(dateTimestamp).year;
    const quarter = Math.ceil(DateTime.fromMillis(dateTimestamp).month / 3);
    return { year, quarter };
  }, [dateTimestamp]);

  // Get previous day of week - memoized pure function
  const getPreviousDayOfWeek = useCallback((currentDay: DayOfWeek): DayOfWeek => {
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
  }, []);

  // Get all past days in the week - memoized to avoid recalculation
  const getAllPastDaysOfWeek = useCallback(
    (currentDay: DayOfWeek): DayOfWeek[] => {
      const pastDays: DayOfWeek[] = [];
      let day = currentDay;

      while (day > DayOfWeek.MONDAY) {
        const previousDay = getPreviousDayOfWeek(day);
        pastDays.push(previousDay);
        day = previousDay;
      }

      return pastDays;
    },
    [getPreviousDayOfWeek]
  );

  // Memoize the previous day calculation
  const previousDayOfWeek = useMemo(
    () => getPreviousDayOfWeek(dayOfWeek),
    [getPreviousDayOfWeek, dayOfWeek]
  );

  // Memoize all past days calculation
  const allPastDaysOfWeek = useMemo(
    () => getAllPastDaysOfWeek(dayOfWeek),
    [getAllPastDaysOfWeek, dayOfWeek]
  );

  const handlePreviewTasks = useCallback(
    async (fromAllPastDays = false) => {
      if (isMonday) return;

      setIsPullingFromAllPastDays(fromAllPastDays);

      try {
        const { year, quarter } = dateCalculations;

        if (fromAllPastDays) {
          // Get all past days in the week
          const allTasks: PreviewTask[] = [];
          const isoYear = getISOWeekYear(new Date(dateTimestamp));

          // Preview tasks from each past day
          for (const pastDay of allPastDaysOfWeek) {
            // Preview regular goals
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
              allTasks.push(...previewData.tasks);
            }

            // Preview adhoc goals
            const adhocPreviewData = await moveAdhocGoalsFromDay(
              {
                year: isoYear,
                weekNumber,
                dayOfWeek: pastDay,
              },
              {
                year: isoYear,
                weekNumber,
                dayOfWeek,
              },
              true // dry-run
            );

            if (
              'canMove' in adhocPreviewData &&
              adhocPreviewData.canMove &&
              adhocPreviewData.goals
            ) {
              // Convert adhoc goals to PreviewTask format
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
              allTasks.push(...adhocTasks);
            }
          }

          if (allTasks.length > 0) {
            setPreview({
              previousDay: 'all past days',
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
          const isoYear = getISOWeekYear(new Date(dateTimestamp));
          const allTasks: PreviewTask[] = [];

          // Preview regular goals
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

          if ('canMove' in previewData && previewData.canMove && previewData.tasks.length > 0) {
            allTasks.push(...previewData.tasks);
          }

          // Preview adhoc goals
          const adhocPreviewData = await moveAdhocGoalsFromDay(
            {
              year: isoYear,
              weekNumber,
              dayOfWeek: previousDayOfWeek,
            },
            {
              year: isoYear,
              weekNumber,
              dayOfWeek,
            },
            true // dry-run
          );

          if ('canMove' in adhocPreviewData && adhocPreviewData.canMove && adhocPreviewData.goals) {
            // Convert adhoc goals to PreviewTask format
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
            allTasks.push(...adhocTasks);
          }

          // Check if we have any tasks to move
          if (allTasks.length > 0) {
            setPreview({
              previousDay: getDayName(previousDayOfWeek),
              targetDay: getDayName(dayOfWeek),
              tasks: allTasks,
            });
            setShowConfirmDialog(true);
          } else {
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
    },
    [
      isMonday,
      dateTimestamp,
      dateCalculations,
      allPastDaysOfWeek,
      moveGoalsFromDay,
      moveAdhocGoalsFromDay,
      weekNumber,
      dayOfWeek,
      previousDayOfWeek,
    ]
  );

  const handleMoveTasksFromPreviousDay = useCallback(async () => {
    if (isMonday) return;
    try {
      setIsMovingTasks(true);
      const { year, quarter } = dateCalculations;
      const isoYear = getISOWeekYear(new Date(dateTimestamp));

      if (isPullingFromAllPastDays) {
        // Handle pulling from all past days
        let totalTasksMoved = 0;
        let totalAdhocGoalsMoved = 0;

        // Move tasks from each past day
        for (const pastDay of allPastDaysOfWeek) {
          // Move regular goals
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

          if (
            result &&
            typeof result === 'object' &&
            'tasksMoved' in result &&
            typeof result.tasksMoved === 'number'
          ) {
            totalTasksMoved += result.tasksMoved;
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
              dayOfWeek,
            },
            false // not dry-run
          );

          if (
            adhocResult &&
            typeof adhocResult === 'object' &&
            'goalsMoved' in adhocResult &&
            typeof adhocResult.goalsMoved === 'number'
          ) {
            totalAdhocGoalsMoved += adhocResult.goalsMoved;
          }
        }

        const totalMoved = totalTasksMoved + totalAdhocGoalsMoved;
        setShowConfirmDialog(false);
        toast({
          title: 'Tasks moved',
          description: `Moved ${totalMoved} incomplete task${totalMoved !== 1 ? 's' : ''} from all previous days to ${getDayName(
            dayOfWeek
          )}.`,
          variant: 'default',
        });
      } else {
        // Original functionality for single previous day
        const result = await moveGoalsFromDay({
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

        // Move adhoc goals
        const adhocResult = await moveAdhocGoalsFromDay(
          {
            year: isoYear,
            weekNumber,
            dayOfWeek: previousDayOfWeek,
          },
          {
            year: isoYear,
            weekNumber,
            dayOfWeek,
          },
          false // not dry-run
        );

        let totalMoved = 0;
        if (
          result &&
          typeof result === 'object' &&
          'tasksMoved' in result &&
          typeof result.tasksMoved === 'number'
        ) {
          totalMoved += result.tasksMoved;
        }
        if (
          adhocResult &&
          typeof adhocResult === 'object' &&
          'goalsMoved' in adhocResult &&
          typeof adhocResult.goalsMoved === 'number'
        ) {
          totalMoved += adhocResult.goalsMoved;
        }

        setShowConfirmDialog(false);
        toast({
          title: 'Tasks moved',
          description: `Moved ${totalMoved} incomplete task${totalMoved !== 1 ? 's' : ''} from ${getDayName(
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
  }, [
    isMonday,
    dateTimestamp,
    dateCalculations,
    isPullingFromAllPastDays,
    allPastDaysOfWeek,
    moveGoalsFromDay,
    moveAdhocGoalsFromDay,
    weekNumber,
    dayOfWeek,
    previousDayOfWeek,
  ]);

  // Memoize tooltip content to avoid recalculation
  const tooltipContent = useMemo(() => {
    if (isMonday) {
      return 'Cannot pull tasks to Monday as it is the first day of the week';
    }
    if (isMovingTasks) {
      return 'Moving tasks...';
    }
    return 'Pull incomplete tasks from previous days';
  }, [isMonday, isMovingTasks]);

  // Memoize click handlers to prevent unnecessary re-renders
  const handlePreviewFromPreviousDay = useCallback(() => {
    if (!isMovingTasks) {
      handlePreviewTasks(false);
    }
  }, [isMovingTasks, handlePreviewTasks]);

  const handlePreviewFromAllPastDays = useCallback(() => {
    if (!isMovingTasks) {
      handlePreviewTasks(true);
    }
  }, [isMovingTasks, handlePreviewTasks]);

  return (
    <>
      <div className="flex justify-end mb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isDisabled}
              className="text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={5} className="z-50">
            {isDisabled ? (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full cursor-not-allowed">
                      <DropdownMenuItem className="cursor-not-allowed opacity-50" disabled>
                        <History className="mr-2 h-4 w-4" />
                        <span className="text-sm">Pull Incomplete Tasks</span>
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
                <DropdownMenuLabel className="font-semibold px-3 py-2">
                  Pull Incomplete Tasks
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  disabled={isMovingTasks}
                  onClick={handlePreviewFromPreviousDay}
                  className="flex items-center"
                >
                  <History className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">From previous day</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  disabled={isMovingTasks}
                  onClick={handlePreviewFromAllPastDays}
                  className="flex items-center"
                >
                  <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">From all past days in week</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
