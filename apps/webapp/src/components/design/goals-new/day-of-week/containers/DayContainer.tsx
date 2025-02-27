import { DayOfWeek } from '@/lib/constants';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { DayHeader } from '../components/DayHeader';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { DailyGoalGroup } from '@/components/design/goals-new/daily-goal/DailyGoalGroup';
import { DailyGoalItem } from '@/components/design/goals-new/daily-goal/DailyGoalItem';
import { CreateGoalInput } from '@/components/design/goals-new/CreateGoalInput';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { Star, Pin, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { GoalEditPopover } from '@/components/design/goals-new/GoalEditPopover';
import { SafeHTML } from '@/components/ui/safe-html';
import { useState } from 'react';

export interface DayContainerProps {
  dayOfWeek: DayOfWeek;
  weekNumber: number;
  dateTimestamp: number;
  weeklyGoalsWithQuarterly: Array<{
    weeklyGoal: GoalWithDetailsAndChildren;
    quarterlyGoal: GoalWithDetailsAndChildren;
  }>;
  onUpdateGoalTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  onCreateGoal: (weeklyGoalId: Id<'goals'>, title: string) => Promise<void>;
  isCreating?: Record<string, boolean>;
  sortDailyGoals?: (
    goals: GoalWithDetailsAndChildren[]
  ) => GoalWithDetailsAndChildren[];
}

export const DayContainer = ({
  dayOfWeek,
  weekNumber,
  dateTimestamp,
  weeklyGoalsWithQuarterly,
  onUpdateGoalTitle,
  onDeleteGoal,
  onCreateGoal,
  isCreating = {},
  sortDailyGoals,
}: DayContainerProps) => {
  // Track new goal titles for each weekly goal
  const [newGoalTitles, setNewGoalTitles] = useState<Record<string, string>>(
    {}
  );

  // Group weekly goals by quarterly goal ID
  const groupedByQuarterly: Record<
    string,
    {
      quarterlyGoal: GoalWithDetailsAndChildren;
      weeklyGoals: GoalWithDetailsAndChildren[];
    }
  > = {};

  weeklyGoalsWithQuarterly.forEach(({ weeklyGoal, quarterlyGoal }) => {
    const quarterlyId = quarterlyGoal._id.toString();
    if (!groupedByQuarterly[quarterlyId]) {
      groupedByQuarterly[quarterlyId] = {
        quarterlyGoal,
        weeklyGoals: [],
      };
    }
    groupedByQuarterly[quarterlyId].weeklyGoals.push(weeklyGoal);
  });

  // Sort the quarterly goals: starred first, then pinned, then the rest
  const sortedQuarterlyEntries = Object.entries(groupedByQuarterly).sort(
    ([, a], [, b]) => {
      const aIsStarred = a.quarterlyGoal.state?.isStarred ?? false;
      const aIsPinned = a.quarterlyGoal.state?.isPinned ?? false;
      const bIsStarred = b.quarterlyGoal.state?.isStarred ?? false;
      const bIsPinned = b.quarterlyGoal.state?.isPinned ?? false;

      if (aIsStarred && !bIsStarred) return -1;
      if (!aIsStarred && bIsStarred) return 1;
      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;

      return a.quarterlyGoal.title.localeCompare(b.quarterlyGoal.title);
    }
  );

  return (
    <div className="space-y-2 mb-1 border-b border-gray-100 last:border-b-0">
      <DayHeader
        dayOfWeek={dayOfWeek}
        weekNumber={weekNumber}
        dateTimestamp={dateTimestamp}
      />
      <div className="space-y-2">
        {sortedQuarterlyEntries.map(
          ([quarterlyId, { quarterlyGoal, weeklyGoals }]) => {
            const isStarred = quarterlyGoal.state?.isStarred ?? false;
            const isPinned = quarterlyGoal.state?.isPinned ?? false;

            // Calculate if all daily goals are complete for this quarterly goal
            const allDailyGoals = weeklyGoals.flatMap((weekly) =>
              weekly.children.filter(
                (daily) => daily.state?.daily?.dayOfWeek === dayOfWeek
              )
            );
            const isSoftComplete =
              allDailyGoals.length > 0 &&
              allDailyGoals.every((goal) => goal.state?.isComplete);

            return (
              <div key={quarterlyId} className="mb-2">
                <div
                  className={cn(
                    'rounded-md px-3 py-2 transition-colors',
                    isSoftComplete ? 'bg-green-50' : '',
                    isPinned ? 'bg-blue-50' : '',
                    isStarred && !isPinned ? 'bg-yellow-50' : '',
                    !isStarred && !isPinned && !isSoftComplete ? 'bg-white' : ''
                  )}
                >
                  {/* Quarterly Goal Title (shown once) */}
                  <div className="flex items-center gap-1.5 mb-2">
                    {isStarred && (
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    )}
                    {isPinned && (
                      <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400 flex-shrink-0" />
                    )}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="p-0 h-auto hover:bg-transparent font-semibold justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
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

                  {/* Weekly Goals (each with their daily goals) */}
                  <div className="space-y-2">
                    {weeklyGoals.map((weeklyGoal) => (
                      <div key={weeklyGoal._id.toString()} className="ml-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              className="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full mb-1"
                            >
                              <span className="break-words w-full whitespace-pre-wrap text-gray-600">
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

                        <div className="space-y-1">
                          {sortDailyGoals
                            ? sortDailyGoals(
                                weeklyGoal.children.filter(
                                  (dailyGoal) =>
                                    dailyGoal.state?.daily?.dayOfWeek ===
                                    dayOfWeek
                                )
                              ).map((dailyGoal) => (
                                <div
                                  key={dailyGoal._id.toString()}
                                  className="ml-2"
                                >
                                  <DailyGoalItem
                                    goal={dailyGoal}
                                    onUpdateTitle={onUpdateGoalTitle}
                                    onDelete={onDeleteGoal}
                                  />
                                </div>
                              ))
                            : weeklyGoal.children
                                .filter(
                                  (dailyGoal) =>
                                    dailyGoal.state?.daily?.dayOfWeek ===
                                    dayOfWeek
                                )
                                .map((dailyGoal) => (
                                  <div
                                    key={dailyGoal._id.toString()}
                                    className="ml-2"
                                  >
                                    <DailyGoalItem
                                      goal={dailyGoal}
                                      onUpdateTitle={onUpdateGoalTitle}
                                      onDelete={onDeleteGoal}
                                    />
                                  </div>
                                ))}

                          {/* Add task input for this weekly goal */}
                          <div className="ml-2 mt-1">
                            <CreateGoalInput
                              placeholder="Add a task..."
                              value={
                                newGoalTitles[weeklyGoal._id.toString()] || ''
                              }
                              onChange={(value) => {
                                setNewGoalTitles({
                                  ...newGoalTitles,
                                  [weeklyGoal._id.toString()]: value,
                                });
                              }}
                              onSubmit={() => {
                                const title =
                                  newGoalTitles[weeklyGoal._id.toString()];
                                if (title && title.trim()) {
                                  onCreateGoal(weeklyGoal._id, title.trim());
                                  setNewGoalTitles({
                                    ...newGoalTitles,
                                    [weeklyGoal._id.toString()]: '',
                                  });
                                }
                              }}
                              disabled={isCreating[weeklyGoal._id]}
                            >
                              {isCreating[weeklyGoal._id] && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                  <Spinner className="h-4 w-4" />
                                </div>
                              )}
                            </CreateGoalInput>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};
