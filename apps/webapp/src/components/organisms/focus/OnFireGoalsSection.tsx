import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { useMemo } from 'react';
import { DailyGoalItem } from '@/components/organisms/goals-new/daily-goal/DailyGoalItem';
import { WeeklyGoalItem } from '@/components/molecules/day-of-week/components/WeeklyGoalItem';
import { Flame, Edit2, Star, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { SafeHTML } from '@/components/ui/safe-html';
import { cn } from '@/lib/utils';

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
}

export const OnFireGoalsSection: React.FC<OnFireGoalsSectionProps> = ({
  weeklyGoalsWithQuarterly,
  selectedDayOfWeek,
  onUpdateGoalTitle,
  onDeleteGoal,
  fireGoals,
  toggleFireStatus,
}) => {
  const { weeklyGoals } = useWeek();

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

  if (!onFireGoalsByQuarterly) return null;

  return (
    <div className="bg-red-50 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-red-700">Urgent Items</h2>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="p-0 h-auto hover:bg-transparent font-semibold justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full text-red-800 hover:text-red-900 hover:no-underline"
                    >
                      <span className="break-words w-full whitespace-pre-wrap">
                        {quarterlyGoal.title}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-4">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold break-words flex-1 mr-2">
                          {quarterlyGoal.title}
                        </h3>
                        <GoalEditPopover
                          title={quarterlyGoal.title}
                          details={quarterlyGoal.details}
                          onSave={async (title, details) => {
                            await onUpdateGoalTitle(
                              quarterlyGoal._id,
                              title,
                              details
                            );
                          }}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                      {quarterlyGoal.details && (
                        <SafeHTML
                          html={quarterlyGoal.details}
                          className="mt-2 text-sm"
                        />
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-3 ml-2">
                {weeklyGoals.map(
                  ({ weeklyGoal, dailyGoals, isWeeklyOnFire }) => (
                    <div key={weeklyGoal._id.toString()} className="space-y-1">
                      {/* Case 1: Weekly goals without children */}
                      {isWeeklyOnFire && dailyGoals.length === 0 && (
                        <div className="ml-2">
                          <WeeklyGoalItem
                            goal={weeklyGoal}
                            onUpdateTitle={onUpdateGoalTitle}
                            onDelete={onDeleteGoal}
                            isOnFire={true}
                            toggleFireStatus={toggleFireStatus}
                          />
                        </div>
                      )}

                      {/* Case 2: Weekly goals with daily children */}
                      {dailyGoals.length > 0 && (
                        <div className="space-y-1">
                          {/* Weekly Goal Header (only if it has daily goals) */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                className="p-0 h-auto text-sm font-medium text-gray-700 hover:text-gray-900 ml-2 hover:bg-transparent hover:no-underline"
                              >
                                <span className="break-words w-full whitespace-pre-wrap">
                                  {weeklyGoal.title}
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-4">
                              <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <h3 className="font-semibold break-words flex-1 mr-2">
                                    {weeklyGoal.title}
                                  </h3>
                                  <GoalEditPopover
                                    title={weeklyGoal.title}
                                    details={weeklyGoal.details}
                                    onSave={async (title, details) => {
                                      await onUpdateGoalTitle(
                                        weeklyGoal._id,
                                        title,
                                        details
                                      );
                                    }}
                                    trigger={
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                    }
                                  />
                                </div>
                                {weeklyGoal.details && (
                                  <SafeHTML
                                    html={weeklyGoal.details}
                                    className="mt-2 text-sm"
                                  />
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Daily Goals */}
                          <div className="ml-4 space-y-1">
                            {dailyGoals.map((dailyGoal) => (
                              <DailyGoalItem
                                key={dailyGoal._id.toString()}
                                goal={dailyGoal}
                                onUpdateTitle={onUpdateGoalTitle}
                                onDelete={onDeleteGoal}
                                isOnFire={true}
                                toggleFireStatus={toggleFireStatus}
                              />
                            ))}
                          </div>
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
