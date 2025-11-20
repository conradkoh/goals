import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Clock, Info, Pin, Star } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { AdhocGoalItem } from '@/components/molecules/AdhocGoalItem';
import { WeeklyGoalTaskItem } from '@/components/molecules/day-of-week/components/WeeklyGoalTaskItem';
import { GoalDetailsPopover } from '@/components/molecules/goal-details';
import { DailyGoalTaskItem } from '@/components/organisms/DailyGoalTaskItem';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGoalActionsContext } from '@/contexts/GoalActionsContext';
import { GoalProvider } from '@/contexts/GoalContext';
import { useGoalStatus } from '@/contexts/GoalStatusContext';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useWeek } from '@/hooks/useWeek';
import type { DayOfWeek } from '@/lib/constants';
import { getDueDateStyle } from '@/lib/date/getDueDateStyle';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the PendingGoalsSection component.
 */
interface PendingGoalsSectionProps {
  /** Array of weekly goals with their parent quarterly goals */
  weeklyGoalsWithQuarterly: Array<{
    weeklyGoal: GoalWithDetailsAndChildren;
    quarterlyGoal: GoalWithDetailsAndChildren;
  }>;
  /** The currently selected day of the week */
  selectedDayOfWeek: DayOfWeek;
  /** The ISO week number being displayed */
  weekNumber: number;
}

/**
 * Displays goals marked as "pending" (waiting for someone/something) for the selected day.
 * Shows quarterly, weekly, daily, and adhoc goals that are marked as pending.
 * Goals are grouped by their hierarchy for better organization.
 */
export const PendingGoalsSection: React.FC<PendingGoalsSectionProps> = ({
  weeklyGoalsWithQuarterly,
  selectedDayOfWeek,
  weekNumber,
}) => {
  const { onUpdateGoal } = useGoalActionsContext();
  const { weeklyGoals } = useWeek();
  const { pendingGoals, getPendingDescription } = useGoalStatus();
  const { sessionId } = useSession();
  const { adhocGoals, updateAdhocGoal, deleteAdhocGoal } = useAdhocGoals(sessionId);

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

    weeklyGoalsWithQuarterly.forEach(({ weeklyGoal, quarterlyGoal }) => {
      const quarterlyId = quarterlyGoal._id.toString();
      const weeklyId = weeklyGoal._id.toString();
      const isWeeklyPending = pendingGoalIds.has(weeklyId);
      const weeklyPendingDescription = getPendingDescription(weeklyGoal._id);

      const pendingDailyGoals = weeklyGoal.children.filter(
        (dailyGoal) =>
          dailyGoal.state?.daily?.dayOfWeek === selectedDayOfWeek &&
          pendingGoalIds.has(dailyGoal._id.toString())
      );

      if (!isWeeklyPending && pendingDailyGoals.length === 0) return;

      if (!result.has(quarterlyId)) {
        result.set(quarterlyId, {
          quarterlyGoal,
          weeklyGoals: [],
        });
      }

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
        weeklyGoalEntry.isWeeklyPending = weeklyGoalEntry.isWeeklyPending || isWeeklyPending;
        if (weeklyPendingDescription) {
          weeklyGoalEntry.pendingDescription = weeklyPendingDescription;
        }
      }

      if (pendingDailyGoals.length > 0) {
        weeklyGoalEntry.dailyGoals.push(...pendingDailyGoals);
      }
    });

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

          if (!result.has(quarterlyId)) {
            result.set(quarterlyId, {
              quarterlyGoal: parentQuarterlyGoal,
              weeklyGoals: [],
            });
          }

          const existingEntry = result
            .get(quarterlyId)
            ?.weeklyGoals.find((entry) => entry.weeklyGoal._id === weeklyGoal._id);

          if (!existingEntry) {
            result.get(quarterlyId)?.weeklyGoals.push({
              weeklyGoal,
              dailyGoals: [],
              isWeeklyPending: true,
              pendingDescription: weeklyPendingDescription,
            });
          } else {
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

  const pendingAdhocGoals = useMemo(() => {
    if (pendingGoals.size === 0 || !adhocGoals) return [];

    const pendingGoalIds = new Set(pendingGoals.keys());

    return adhocGoals.filter((goal) => {
      if (!pendingGoalIds.has(goal._id.toString())) return false;
      if (goal.adhoc?.weekNumber !== weekNumber) return false;
      if (goal.adhoc?.dayOfWeek && goal.adhoc.dayOfWeek !== selectedDayOfWeek) return false;
      return true;
    });
  }, [pendingGoals, adhocGoals, weekNumber, selectedDayOfWeek]);

  const handleUpdateGoal = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string, dueDate?: number) => {
      await onUpdateGoal(goalId, title, details, dueDate);
    },
    [onUpdateGoal]
  );

  const handleUpdateAdhocGoal = useCallback(
    async (
      goalId: Id<'goals'>,
      title: string,
      details?: string,
      dueDate?: number,
      domainId?: Id<'domains'> | null
    ) => {
      await updateAdhocGoal(goalId, { title, details, dueDate, domainId });
    },
    [updateAdhocGoal]
  );

  const handleAdhocCompleteChange = useCallback(
    async (goalId: Id<'goals'>, isComplete: boolean) => {
      await updateAdhocGoal(goalId, { isComplete });
    },
    [updateAdhocGoal]
  );

  const handleDeleteAdhocGoal = useCallback(
    async (goalId: Id<'goals'>) => {
      await deleteAdhocGoal(goalId);
    },
    [deleteAdhocGoal]
  );

  if (!pendingGoalsByQuarterly && pendingAdhocGoals.length === 0) {
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
        {pendingGoalsByQuarterly &&
          Array.from(pendingGoalsByQuarterly.entries()).map(
            ([quarterlyId, { quarterlyGoal, weeklyGoals }]) => (
              <div key={quarterlyId} className="border-b border-border pb-3 last:border-b-0">
                <div className="flex items-center gap-1.5 mb-2">
                  {quarterlyGoal.state?.isStarred && (
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  )}
                  {quarterlyGoal.state?.isPinned && (
                    <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400 flex-shrink-0" />
                  )}
                  <GoalProvider goal={quarterlyGoal}>
                    <GoalDetailsPopover
                      onSave={(title, details, dueDate) =>
                        handleUpdateGoal(quarterlyGoal._id, title, details, dueDate)
                      }
                      triggerClassName="p-0 h-auto hover:bg-transparent font-semibold justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full text-foreground hover:text-orange-600 dark:hover:text-orange-400 hover:no-underline"
                      titleClassName={cn(
                        'break-words w-full whitespace-pre-wrap flex items-center',
                        quarterlyGoal.isComplete ? 'flex items-center' : '',
                        getDueDateStyle(
                          quarterlyGoal.dueDate ? new Date(quarterlyGoal.dueDate) : null,
                          quarterlyGoal.isComplete
                        )
                      )}
                    />
                  </GoalProvider>
                </div>

                <div className="space-y-2 ml-4">
                  {weeklyGoals.map(
                    ({ weeklyGoal, dailyGoals, isWeeklyPending, pendingDescription }) => (
                      <div key={`weekly-${weeklyGoal._id.toString()}`}>
                        {(isWeeklyPending || dailyGoals.length > 0) && (
                          <div className="mb-1">
                            <GoalProvider goal={weeklyGoal}>
                              <WeeklyGoalTaskItem />
                            </GoalProvider>
                            {isWeeklyPending && pendingDescription && (
                              <div className="mt-1 ml-6 text-xs text-orange-600 dark:text-orange-400 italic">
                                <span className="font-medium">Pending:</span> {pendingDescription}
                              </div>
                            )}
                          </div>
                        )}

                        {dailyGoals.length > 0 && (
                          <div className="space-y-1 ml-4">
                            {dailyGoals.map((dailyGoal) => {
                              const dailyPendingDescription = getPendingDescription(dailyGoal._id);
                              return (
                                <div key={dailyGoal._id.toString()}>
                                  <GoalProvider goal={dailyGoal}>
                                    <DailyGoalTaskItem />
                                  </GoalProvider>
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

        {pendingAdhocGoals.length > 0 && (
          <div className="border-b border-border pb-3 last:border-b-0">
            <div className="flex items-center gap-1.5 mb-2">
              <h3 className="font-semibold text-foreground">Adhoc Tasks</h3>
            </div>
            <div className="space-y-1 ml-4">
              {pendingAdhocGoals.map((goal) => {
                const pendingDescription = getPendingDescription(goal._id);
                return (
                  <div key={goal._id}>
                    <AdhocGoalItem
                      goal={goal}
                      onCompleteChange={handleAdhocCompleteChange}
                      onUpdate={handleUpdateAdhocGoal}
                      onDelete={handleDeleteAdhocGoal}
                      showDueDate={false}
                      showDomain={true}
                    />
                    {pendingDescription && (
                      <div className="mt-1 ml-6 text-xs text-orange-600 dark:text-orange-400 italic">
                        <span className="font-medium">Pending:</span> {pendingDescription}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
