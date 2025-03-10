import { WeeklyGoalTaskItem } from '@/components/molecules/day-of-week/components/WeeklyGoalTaskItem';
import { GoalDetailsPopover } from '@/components/molecules/goal-details';
import { DailyGoalTaskItem } from '@/components/organisms/goals-new/daily-goal/DailyGoalTaskItem';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Eye, EyeOff, Flame, Info, Pin, Star } from 'lucide-react';
import { useCallback, useMemo } from 'react';

interface OnFireGoalsSectionProps {
  weeklyGoalsWithQuarterly: Array<{
    weeklyGoal: GoalWithDetailsAndChildren;
    quarterlyGoal: GoalWithDetailsAndChildren;
  }>;
  selectedDayOfWeek: DayOfWeek;
  onUpdateGoalTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  fireGoals: Set<string>;
  toggleFireStatus: (goalId: Id<'goals'>) => void;
  isFocusModeEnabled?: boolean;
  toggleFocusMode?: () => void;
}

export const OnFireGoalsSection: React.FC<OnFireGoalsSectionProps> = ({
  weeklyGoalsWithQuarterly,
  selectedDayOfWeek,
  onUpdateGoalTitle,
  onDeleteGoal,
  fireGoals,
  toggleFireStatus,
  isFocusModeEnabled = false,
  toggleFocusMode,
}) => {
  const { weeklyGoals, toggleGoalCompletion, weekNumber } = useWeek();

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

      // Add weekly goal with its on-fire daily goals
      result.get(quarterlyId)!.weeklyGoals.push({
        weeklyGoal,
        dailyGoals: onFireDailyGoals,
        isWeeklyOnFire,
      });
    });

    // Process standalone weekly goals that are on fire (those without daily goals for the selected day)
    weeklyGoals
      .filter(
        (goal) =>
          fireGoals.has(goal._id.toString()) &&
          !goal.children.some(
            (child) => child.state?.daily?.dayOfWeek === selectedDayOfWeek
          )
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

          // Add weekly goal
          result.get(quarterlyId)!.weeklyGoals.push({
            weeklyGoal,
            dailyGoals: [],
            isWeeklyOnFire: true,
          });
        }
      });

    return result.size > 0 ? result : null;
  }, [fireGoals, weeklyGoalsWithQuarterly, selectedDayOfWeek, weeklyGoals]);

  // Check if there are any visible fire goals for the current day
  const hasVisibleFireGoalsForCurrentDay = useMemo(() => {
    return onFireGoalsByQuarterly !== null;
  }, [onFireGoalsByQuarterly]);

  const handleToggleGoalCompletion = useCallback(
    (goalId: Id<'goals'>, isComplete: boolean) => {
      toggleGoalCompletion({
        goalId,
        weekNumber,
        isComplete,
        updateChildren: false,
      });
    },
    [toggleGoalCompletion, weekNumber]
  );

  const handleUpdateGoalTitle = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string) => {
      await onUpdateGoalTitle(goalId, title, details);
    },
    [onUpdateGoalTitle]
  );

  if (!onFireGoalsByQuarterly) {
    // If there are no visible fire goals but focus mode is enabled and toggle function is available,
    // still render the toggle button to allow disabling focus mode
    if (isFocusModeEnabled && toggleFocusMode) {
      return (
        <div className="bg-red-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-red-700">
                Urgent Items
              </h2>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-red-400 hover:text-red-500 transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent
                    sideOffset={5}
                    className="animate-in fade-in-50 duration-300"
                  >
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
                    onClick={toggleFocusMode}
                    className="text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <EyeOff className="h-4 w-4 mr-1" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show all goals</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-red-600">
            No urgent items for today. Showing all goals.
          </p>
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
              <TooltipContent
                sideOffset={5}
                className="animate-in fade-in-50 duration-300"
              >
                <p className="text-xs max-w-xs">
                  These urgent items are stored locally in your browser.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {toggleFocusMode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={'ghost'}
                  size="sm"
                  onClick={toggleFocusMode}
                  className="text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  {isFocusModeEnabled ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFocusModeEnabled
                  ? 'Show all goals'
                  : 'Focus on urgent items only'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="space-y-4">
        {Array.from(onFireGoalsByQuarterly.entries()).map(
          ([quarterlyId, { quarterlyGoal, weeklyGoals }]) => (
            <div
              key={quarterlyId}
              className="border-b border-red-100 pb-3 last:border-b-0"
            >
              {/* Quarterly Goal Header with Popover */}
              <div className="flex items-center gap-1.5 mb-2">
                {quarterlyGoal.state?.isStarred && (
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                )}
                {quarterlyGoal.state?.isPinned && (
                  <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400 flex-shrink-0" />
                )}
                <GoalDetailsPopover
                  title={quarterlyGoal.title}
                  details={quarterlyGoal.details}
                  onSave={(title, details) =>
                    handleUpdateGoalTitle(quarterlyGoal._id, title, details)
                  }
                  triggerClassName="p-0 h-auto hover:bg-transparent font-semibold justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full text-red-800 hover:text-red-900 hover:no-underline"
                  titleClassName={cn(
                    'break-words w-full whitespace-pre-wrap flex items-center',
                    quarterlyGoal.state?.isComplete ? 'flex items-center' : ''
                  )}
                  additionalContent={
                    <div className="flex items-center space-x-2 pt-2 border-t">
                      <Checkbox
                        id={`complete-onfire-${quarterlyGoal._id}`}
                        checked={quarterlyGoal.state?.isComplete ?? false}
                        onCheckedChange={(checked) =>
                          handleToggleGoalCompletion(
                            quarterlyGoal._id,
                            checked === true
                          )
                        }
                      />
                      <label
                        htmlFor={`complete-onfire-${quarterlyGoal._id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Mark as complete
                      </label>
                    </div>
                  }
                />
              </div>

              {/* Weekly Goals */}
              <div className="space-y-2 ml-4">
                {weeklyGoals.map(
                  ({ weeklyGoal, dailyGoals, isWeeklyOnFire }) => (
                    <div key={weeklyGoal._id.toString()}>
                      {/* Weekly Goal */}
                      {isWeeklyOnFire && (
                        <div className="mb-1">
                          <WeeklyGoalTaskItem
                            goal={weeklyGoal}
                            onUpdateTitle={handleUpdateGoalTitle}
                            isOnFire={true}
                            toggleFireStatus={toggleFireStatus}
                          />
                        </div>
                      )}

                      {/* Daily Goals */}
                      {dailyGoals.length > 0 && (
                        <div className="space-y-1 ml-4">
                          {dailyGoals.map((dailyGoal) => (
                            <DailyGoalTaskItem
                              key={dailyGoal._id.toString()}
                              goal={dailyGoal}
                              onUpdateTitle={handleUpdateGoalTitle}
                              isOnFire={true}
                              toggleFireStatus={toggleFireStatus}
                            />
                          ))}
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
