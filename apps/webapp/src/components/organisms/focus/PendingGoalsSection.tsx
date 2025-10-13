import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Clock, Info, Pin, Star } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { WeeklyGoalTaskItem } from '@/components/molecules/day-of-week/components/WeeklyGoalTaskItem';
import { GoalDetailsPopover } from '@/components/molecules/goal-details';
import { DailyGoalTaskItem } from '@/components/organisms/DailyGoalTaskItem';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGoalStatus } from '@/contexts/GoalStatusContext';
import { useWeek } from '@/hooks/useWeek';
import type { DayOfWeek } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface PendingGoalsSectionProps {
  weeklyGoalsWithQuarterly: Array<{
    weeklyGoal: GoalWithDetailsAndChildren;
    quarterlyGoal: GoalWithDetailsAndChildren;
  }>;
  selectedDayOfWeek: DayOfWeek;
  onUpdateGoalTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
}

export const PendingGoalsSection: React.FC<PendingGoalsSectionProps> = ({
  weeklyGoalsWithQuarterly,
  selectedDayOfWeek,
  onUpdateGoalTitle,
  onDeleteGoal,
}) => {
  const { weeklyGoals } = useWeek();
  const { pendingGoals, getPendingDescription } = useGoalStatus();

  // Group pending goals by quarterly goal
  const pendingGoalsByQuarterly = useMemo(() => {
    if (pendingGoals.size === 0) return null;

    const pendingGoalIds = new Set(pendingGoals.keys());

    const result = new Map<
      string,
      {
        quarterlyGoal: GoalWithDetailsAndChildren;
        weeklyGoals: Array<{
          weeklyGoal: GoalWithDetailsAndChildren;
          dailyGoals: GoalWithDetailsAndChildren[];
          isWeeklyPending: boolean;
          pendingDescription?: string;
        }>;
      }
    >();

    // Process weekly goals with daily goals
    weeklyGoalsWithQuarterly.forEach(({ weeklyGoal, quarterlyGoal }) => {
      const quarterlyId = quarterlyGoal._id.toString();
      const weeklyId = weeklyGoal._id.toString();
      const isWeeklyPending = pendingGoalIds.has(weeklyId);
      const weeklyPendingDescription = getPendingDescription(weeklyGoal._id);

      // Filter daily goals for the selected day that are pending
      const pendingDailyGoals = weeklyGoal.children.filter(
        (dailyGoal) =>
          dailyGoal.state?.daily?.dayOfWeek === selectedDayOfWeek &&
          pendingGoalIds.has(dailyGoal._id.toString())
      );

      // Skip if no pending goals in this weekly goal
      if (!isWeeklyPending && pendingDailyGoals.length === 0) return;

      // Initialize quarterly entry if needed
      if (!result.has(quarterlyId)) {
        result.set(quarterlyId, {
          quarterlyGoal,
          weeklyGoals: [],
        });
      }

      // Find existing weekly goal entry or create a new one
      let weeklyGoalEntry = result
        .get(quarterlyId)
        ?.weeklyGoals.find((entry) => entry.weeklyGoal._id === weeklyGoal._id);

      if (!weeklyGoalEntry) {
        weeklyGoalEntry = {
          weeklyGoal,
          dailyGoals: [],
          isWeeklyPending,
          pendingDescription: weeklyPendingDescription,
        };
        result.get(quarterlyId)?.weeklyGoals.push(weeklyGoalEntry);
      } else {
        // Update pending status if it wasn't already set
        weeklyGoalEntry.isWeeklyPending = weeklyGoalEntry.isWeeklyPending || isWeeklyPending;
        if (weeklyPendingDescription) {
          weeklyGoalEntry.pendingDescription = weeklyPendingDescription;
        }
      }

      // Add daily goals to the weekly goal entry
      if (pendingDailyGoals.length > 0) {
        weeklyGoalEntry.dailyGoals.push(...pendingDailyGoals);
      }
    });

    // Process standalone weekly goals that are pending (those without daily goals for the selected day)
    weeklyGoals
      .filter(
        (goal) =>
          pendingGoalIds.has(goal._id.toString()) &&
          !goal.children.some((child) => child.state?.daily?.dayOfWeek === selectedDayOfWeek)
      )
      .forEach((weeklyGoal) => {
        const parentQuarterlyGoal = weeklyGoalsWithQuarterly.find(
          (item) => item.weeklyGoal._id === weeklyGoal.parentId
        )?.quarterlyGoal;

        if (parentQuarterlyGoal) {
          const quarterlyId = parentQuarterlyGoal._id.toString();
          const weeklyPendingDescription = getPendingDescription(weeklyGoal._id);

          // Initialize quarterly entry if needed
          if (!result.has(quarterlyId)) {
            result.set(quarterlyId, {
              quarterlyGoal: parentQuarterlyGoal,
              weeklyGoals: [],
            });
          }

          // Check if this weekly goal is already in the list
          const existingEntry = result
            .get(quarterlyId)
            ?.weeklyGoals.find((entry) => entry.weeklyGoal._id === weeklyGoal._id);

          if (!existingEntry) {
            // Add weekly goal
            result.get(quarterlyId)?.weeklyGoals.push({
              weeklyGoal,
              dailyGoals: [],
              isWeeklyPending: true,
              pendingDescription: weeklyPendingDescription,
            });
          } else {
            // Update pending status
            existingEntry.isWeeklyPending = true;
            if (weeklyPendingDescription) {
              existingEntry.pendingDescription = weeklyPendingDescription;
            }
          }
        }
      });

    return result.size > 0 ? result : null;
  }, [
    pendingGoals,
    weeklyGoalsWithQuarterly,
    selectedDayOfWeek,
    weeklyGoals,
    getPendingDescription,
  ]);

  const handleUpdateGoalTitle = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string) => {
      await onUpdateGoalTitle(goalId, title, details);
    },
    [onUpdateGoalTitle]
  );

  if (!pendingGoalsByQuarterly) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-muted p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500 dark:text-orange-400" />
          <h2 className="text-lg font-semibold text-foreground">Pending Items</h2>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground hover:text-orange-500 dark:hover:text-orange-400 transition-colors" />
              </TooltipTrigger>
              <TooltipContent sideOffset={5} className="animate-in fade-in-50 duration-300">
                <p className="text-xs max-w-xs">
                  These pending items are waiting for someone or something.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="space-y-4">
        {Array.from(pendingGoalsByQuarterly.entries()).map(
          ([quarterlyId, { quarterlyGoal, weeklyGoals }]) => (
            <div key={quarterlyId} className="border-b border-border pb-3 last:border-b-0">
              {/* Quarterly Goal Header with Popover */}
              <div className="flex items-center gap-1.5 mb-2">
                {quarterlyGoal.state?.isStarred && (
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                )}
                {quarterlyGoal.state?.isPinned && (
                  <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400 flex-shrink-0" />
                )}
                <GoalDetailsPopover
                  goal={quarterlyGoal}
                  onSave={(title, details) =>
                    handleUpdateGoalTitle(quarterlyGoal._id, title, details)
                  }
                  triggerClassName="p-0 h-auto hover:bg-transparent font-semibold justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full text-foreground hover:text-orange-600 dark:hover:text-orange-400 hover:no-underline"
                  titleClassName={cn(
                    'break-words w-full whitespace-pre-wrap flex items-center',
                    quarterlyGoal.isComplete ? 'flex items-center' : ''
                  )}
                />
              </div>

              {/* Weekly Goals */}
              <div className="space-y-2 ml-4">
                {/* Render all weekly goals with their associated daily goals */}
                {weeklyGoals.map(
                  ({ weeklyGoal, dailyGoals, isWeeklyPending, pendingDescription }) => (
                    <div key={`weekly-${weeklyGoal._id.toString()}`}>
                      {/* Always show the weekly goal if it's pending or has daily goals */}
                      {(isWeeklyPending || dailyGoals.length > 0) && (
                        <div className="mb-1">
                          <WeeklyGoalTaskItem
                            goal={weeklyGoal}
                            onUpdateTitle={handleUpdateGoalTitle}
                          />
                          {/* Show pending description if available */}
                          {isWeeklyPending && pendingDescription && (
                            <div className="mt-1 ml-6 text-xs text-orange-600 dark:text-orange-400 italic">
                              <span className="font-medium">Pending:</span> {pendingDescription}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Daily Goals */}
                      {dailyGoals.length > 0 && (
                        <div className="space-y-1 ml-4">
                          {dailyGoals.map((dailyGoal) => {
                            const dailyPendingDescription = getPendingDescription(dailyGoal._id);
                            return (
                              <div key={dailyGoal._id.toString()}>
                                <DailyGoalTaskItem
                                  goal={dailyGoal}
                                  onUpdateTitle={handleUpdateGoalTitle}
                                  onDelete={() => onDeleteGoal(dailyGoal._id)}
                                />
                                {/* Show pending description for daily goal */}
                                {dailyPendingDescription && (
                                  <div className="mt-1 ml-6 text-xs text-orange-600 dark:text-orange-400 italic">
                                    <span className="font-medium">Pending:</span>{' '}
                                    {dailyPendingDescription}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
