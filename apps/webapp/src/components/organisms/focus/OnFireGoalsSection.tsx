import type { Doc, Id } from '@services/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Eye, Flame, Info, Pin, Star } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { AdhocGoalItem } from '@/components/molecules/AdhocGoalItem';
import { WeeklyGoalTaskItem } from '@/components/molecules/day-of-week/components/WeeklyGoalTaskItem';
import { GoalDetailsPopover } from '@/components/molecules/goal-details';
import { DailyGoalTaskItem } from '@/components/organisms/DailyGoalTaskItem';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGoalActionsContext } from '@/contexts/GoalActionsContext';
import { GoalProvider } from '@/contexts/GoalContext';
import { useFireGoals } from '@/contexts/GoalStatusContext';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useWeek } from '@/hooks/useWeek';
import type { DayOfWeek } from '@/lib/constants';
import { getDueDateStyle } from '@/lib/date/getDueDateStyle';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

interface OnFireGoalsSectionProps {
  weeklyGoalsWithQuarterly: Array<{
    weeklyGoal: GoalWithDetailsAndChildren;
    quarterlyGoal: GoalWithDetailsAndChildren;
  }>;
  selectedDayOfWeek: DayOfWeek;
  weekNumber: number;
  isFocusModeEnabled?: boolean;
}

export const OnFireGoalsSection: React.FC<OnFireGoalsSectionProps> = ({
  weeklyGoalsWithQuarterly,
  selectedDayOfWeek,
  weekNumber,
  isFocusModeEnabled = false,
}) => {
  const { onUpdateGoal } = useGoalActionsContext();
  const { weeklyGoals } = useWeek();
  const { fireGoals } = useFireGoals();
  const { sessionId } = useSession();
  const { adhocGoals, updateAdhocGoal, deleteAdhocGoal } = useAdhocGoals(sessionId);

  // Group on-fire goals by quarterly goal
  const onFireGoalsByQuarterly = useMemo(() => {
    if (fireGoals.size === 0) return null;

    const result = new Map<
      string,
      {
        quarterlyGoal: GoalWithDetailsAndChildren;
        weeklyGoals: Array<{
          weeklyGoal: GoalWithDetailsAndChildren;
          dailyGoals: GoalWithDetailsAndChildren[];
          isWeeklyOnFire: boolean;
        }>;
      }
    >();

    // Process weekly goals with daily goals
    weeklyGoalsWithQuarterly.forEach(({ weeklyGoal, quarterlyGoal }) => {
      const quarterlyId = quarterlyGoal._id.toString();
      const weeklyId = weeklyGoal._id.toString();
      const isWeeklyOnFire = fireGoals.has(weeklyId);

      // Filter daily goals for the selected day that are on fire
      const onFireDailyGoals = weeklyGoal.children.filter(
        (dailyGoal) =>
          dailyGoal.state?.daily?.dayOfWeek === selectedDayOfWeek &&
          fireGoals.has(dailyGoal._id.toString())
      );

      // Skip if no on-fire goals in this weekly goal
      if (!isWeeklyOnFire && onFireDailyGoals.length === 0) return;

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
          isWeeklyOnFire,
        };
        result.get(quarterlyId)?.weeklyGoals.push(weeklyGoalEntry);
      } else {
        // Update fire status if it wasn't already set
        weeklyGoalEntry.isWeeklyOnFire = weeklyGoalEntry.isWeeklyOnFire || isWeeklyOnFire;
      }

      // Add daily goals to the weekly goal entry
      if (onFireDailyGoals.length > 0) {
        weeklyGoalEntry.dailyGoals.push(...onFireDailyGoals);
      }
    });

    // Process standalone weekly goals that are on fire (those without daily goals for the selected day)
    weeklyGoals
      .filter(
        (goal) =>
          fireGoals.has(goal._id.toString()) &&
          !goal.children.some((child) => child.state?.daily?.dayOfWeek === selectedDayOfWeek)
      )
      .forEach((weeklyGoal) => {
        const parentQuarterlyGoal = weeklyGoalsWithQuarterly.find(
          (item) => item.weeklyGoal._id === weeklyGoal.parentId
        )?.quarterlyGoal;

        if (parentQuarterlyGoal) {
          const quarterlyId = parentQuarterlyGoal._id.toString();

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
              isWeeklyOnFire: true,
            });
          } else {
            // Update fire status
            existingEntry.isWeeklyOnFire = true;
          }
        }
      });

    return result.size > 0 ? result : null;
  }, [fireGoals, weeklyGoalsWithQuarterly, selectedDayOfWeek, weeklyGoals]);

  // Filter adhoc goals that are on fire for the selected day
  const onFireAdhocGoals = useMemo(() => {
    if (fireGoals.size === 0 || !adhocGoals) return [];

    return adhocGoals.filter((goal) => {
      // Must be on fire
      if (!fireGoals.has(goal._id.toString())) return false;

      // Must be for this week
      if (goal.adhoc?.weekNumber !== weekNumber) return false;

      // Must be for this day OR have no specific day assigned
      if (goal.adhoc?.dayOfWeek && goal.adhoc.dayOfWeek !== selectedDayOfWeek) return false;

      return true;
    });
  }, [fireGoals, adhocGoals, weekNumber, selectedDayOfWeek]);

  const hasAnyFireGoals = onFireGoalsByQuarterly !== null || onFireAdhocGoals.length > 0;

  /**
   * Handles updating goals with proper error handling.
   */
  const _handleUpdateGoal = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string, dueDate?: number) => {
      await onUpdateGoal(goalId, title, details, dueDate);
    },
    [onUpdateGoal]
  );

  /**
   * Handles updating adhoc goals.
   */
  const _handleUpdateAdhocGoal = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string, dueDate?: number) => {
      await updateAdhocGoal(goalId, { title, details, dueDate });
    },
    [updateAdhocGoal]
  );

  /**
   * Handles adhoc goal completion changes.
   */
  const _handleAdhocCompleteChange = useCallback(
    async (goalId: Id<'goals'>, isComplete: boolean) => {
      await updateAdhocGoal(goalId, { isComplete });
    },
    [updateAdhocGoal]
  );

  /**
   * Handles deleting adhoc goals.
   */
  const _handleDeleteAdhocGoal = useCallback(
    async (goalId: Id<'goals'>) => {
      await deleteAdhocGoal(goalId);
    },
    [deleteAdhocGoal]
  );

  if (!hasAnyFireGoals) {
    // If there are no visible fire goals but focus mode is enabled and toggle function is available,
    // still render the toggle button to allow disabling focus mode
    if (isFocusModeEnabled) {
      return (
        <div className="bg-red-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-red-700">Urgent Items</h2>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-red-400 hover:text-red-500 transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent sideOffset={5} className="animate-in fade-in-50 duration-300">
                    <p className="text-xs max-w-xs">
                      These urgent items are stored locally in your browser.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={'ghost'}
                    size="sm"
                    onClick={() => {}} // No toggle function provided, so do nothing
                    className="text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show all goals</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-red-600">No urgent items for today. Showing all goals.</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-red-50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-700">Urgent Items</h2>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-red-400 hover:text-red-500 transition-colors" />
              </TooltipTrigger>
              <TooltipContent sideOffset={5} className="animate-in fade-in-50 duration-300">
                <p className="text-xs max-w-xs">
                  These urgent items are stored locally in your browser.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Removed toggleFocusMode prop, so this block is removed */}
      </div>

      <div className="space-y-4">
        {onFireGoalsByQuarterly &&
          Array.from(onFireGoalsByQuarterly.entries()).map(
            ([quarterlyId, { quarterlyGoal, weeklyGoals }]) => (
              <div key={quarterlyId} className="border-b border-red-100 pb-3 last:border-b-0">
                {/* Quarterly Goal Header with Popover */}
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
                        _handleUpdateGoal(quarterlyGoal._id, title, details, dueDate)
                      }
                      triggerClassName="p-0 h-auto hover:bg-transparent font-semibold justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full text-red-800 hover:text-red-900 hover:no-underline"
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

                {/* Weekly Goals */}
                <div className="space-y-2 ml-4">
                  {/* Render all weekly goals with their associated daily goals */}
                  {weeklyGoals.map(({ weeklyGoal, dailyGoals, isWeeklyOnFire }) => (
                    <div key={`weekly-${weeklyGoal._id.toString()}`}>
                      {/* Always show the weekly goal if it's on fire or has daily goals */}
                      {(isWeeklyOnFire || dailyGoals.length > 0) && (
                        <div className="mb-1">
                          <GoalProvider goal={weeklyGoal}>
                            {/* WeeklyGoalTaskItem gets goal from context */}
                            <WeeklyGoalTaskItem />
                          </GoalProvider>
                        </div>
                      )}

                      {/* Daily Goals */}
                      {dailyGoals.length > 0 && (
                        <div className="space-y-1 ml-4">
                          {dailyGoals.map((dailyGoal) => (
                            <GoalProvider key={dailyGoal._id.toString()} goal={dailyGoal}>
                              {/* DailyGoalTaskItem gets goal from context */}
                              <DailyGoalTaskItem />
                            </GoalProvider>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

        {/* Adhoc Goals Section */}
        {onFireAdhocGoals.length > 0 && (
          <div className="border-b border-red-100 pb-3 last:border-b-0">
            <div className="flex items-center gap-1.5 mb-2">
              <h3 className="font-semibold text-red-800">Adhoc Tasks</h3>
            </div>
            <div className="space-y-1 ml-4">
              {onFireAdhocGoals.map((goal) => (
                <AdhocGoalItem
                  key={goal._id}
                  goal={goal}
                  onCompleteChange={_handleAdhocCompleteChange}
                  onUpdate={_handleUpdateAdhocGoal}
                  onDelete={_handleDeleteAdhocGoal}
                  showDueDate={false}
                  showDomain={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
