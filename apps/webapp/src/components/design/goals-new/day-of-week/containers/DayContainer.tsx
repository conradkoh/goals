import { DailyGoalItem } from '@/components/design/goals-new/daily-goal/DailyGoalItem';
import { GoalEditPopover } from '@/components/design/goals-new/GoalEditPopover';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SafeHTML } from '@/components/ui/safe-html';
import { GoalWithOptimisticStatus } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Edit2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { AddTaskInput } from '../components/AddTaskInput';
import { DayHeader } from '../components/DayHeader';
import { QuarterlyGoalHeader } from '../components/QuarterlyGoalHeader';
import { WeeklyGoalItem } from '../components/WeeklyGoalItem';

// Helper function to check if a goal was completed today
export const wasCompletedToday = (
  goal: GoalWithOptimisticStatus,
  todayTimestamp: number
): boolean => {
  if (!goal.state?.isComplete || !goal.state?.completedAt) return false;

  // Get the start of today
  const startOfToday = DateTime.fromMillis(todayTimestamp)
    .startOf('day')
    .toMillis();
  // Get the end of today
  const endOfToday = DateTime.fromMillis(todayTimestamp)
    .endOf('day')
    .toMillis();

  // Check if the goal was completed today
  return (
    goal.state.completedAt >= startOfToday &&
    goal.state.completedAt <= endOfToday
  );
};

export type DayContainerMode = 'plan' | 'focus';

interface WeeklyGoalSectionProps {
  weeklyGoal: GoalWithDetailsAndChildren;
  dayOfWeek: DayOfWeek;
  mode: DayContainerMode;
  sortDailyGoals?: (
    goals: GoalWithDetailsAndChildren[]
  ) => GoalWithDetailsAndChildren[];
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
  onCreateGoal: (weeklyGoalId: Id<'goals'>, title: string) => Promise<void>;
  isCreating: Record<string, boolean>;
}

const WeeklyGoalSection = ({
  weeklyGoal,
  dayOfWeek,
  mode,
  sortDailyGoals,
  onUpdateTitle,
  onDelete,
  onCreateGoal,
  isCreating,
}: WeeklyGoalSectionProps) => {
  const dailyGoals = weeklyGoal.children.filter(
    (dailyGoal) => dailyGoal.state?.daily?.dayOfWeek === dayOfWeek
  );

  const hasDailyGoals = dailyGoals.length > 0;
  const shouldShowAddTask =
    mode === 'plan' || (mode === 'focus' && hasDailyGoals);

  return (
    <div>
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
                  await onUpdateTitle(weeklyGoal._id, title, details);
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
              <SafeHTML html={weeklyGoal.details} className="mt-2 text-sm" />
            )}
          </div>
        </PopoverContent>
      </Popover>

      <div className="space-y-1">
        {(sortDailyGoals ? sortDailyGoals(dailyGoals) : dailyGoals).map(
          (dailyGoal) => (
            <div key={dailyGoal._id.toString()} className="ml-1">
              <DailyGoalItem
                goal={dailyGoal}
                onUpdateTitle={onUpdateTitle}
                onDelete={onDelete}
              />
            </div>
          )
        )}

        {shouldShowAddTask && (
          <AddTaskInput
            weeklyGoalId={weeklyGoal._id}
            isCreating={isCreating[weeklyGoal._id]}
            onCreateGoal={onCreateGoal}
          />
        )}
      </div>
    </div>
  );
};

interface QuarterlyGoalSectionProps {
  quarterlyGoal: GoalWithDetailsAndChildren;
  weeklyGoals: GoalWithDetailsAndChildren[];
  dayOfWeek: DayOfWeek;
  mode: DayContainerMode;
  sortDailyGoals?: (
    goals: GoalWithDetailsAndChildren[]
  ) => GoalWithDetailsAndChildren[];
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
  onCreateGoal: (weeklyGoalId: Id<'goals'>, title: string) => Promise<void>;
  isCreating: Record<string, boolean>;
}

const QuarterlyGoalSection = ({
  quarterlyGoal,
  weeklyGoals,
  dayOfWeek,
  mode,
  sortDailyGoals,
  onUpdateTitle,
  onDelete,
  onCreateGoal,
  isCreating,
}: QuarterlyGoalSectionProps) => {
  const isStarred = quarterlyGoal.state?.isStarred ?? false;
  const isPinned = quarterlyGoal.state?.isPinned ?? false;

  const { weeklyGoalsForChecklist, weeklyGoalsForQuarterlySection } =
    useMemo(() => {
      return {
        weeklyGoalsForChecklist: weeklyGoals.filter((weekly) => {
          if (!weekly.state) return false;
          // exclusion condition 1: weekly goal has children in the week
          const hasChildrenInWeek = weekly.children.length > 0;
          if (hasChildrenInWeek) return false; //if there are children, immediately filter out

          const completedAt = weekly.state.completedAt
            ? DateTime.fromMillis(weekly.state?.completedAt)
            : null;

          //exclusion condition 2: weekly goal is complete but no completion date (for legacy records)
          if (weekly.state?.isComplete && !completedAt) {
            return false;
          }
          // exclusion condition 3: weekly goal is complete in a day other than the current day
          const isCompleteInOtherDays =
            weekly.state?.isComplete &&
            completedAt &&
            completedAt?.get('year') === DateTime.now().get('year') &&
            completedAt?.get('quarter') === DateTime.now().get('quarter') &&
            completedAt?.get('weekNumber') !== DateTime.now().get('weekNumber');
          if (isCompleteInOtherDays) return false;

          return true;
        }),
        weeklyGoalsForQuarterlySection:
          mode === 'focus'
            ? weeklyGoals.filter((weekly) =>
                weekly.children.some(
                  (daily) => daily.state?.daily?.dayOfWeek === dayOfWeek
                )
              )
            : weeklyGoals,
      };
    }, [weeklyGoals, dayOfWeek]);
  if (
    mode === 'focus' &&
    weeklyGoalsForQuarterlySection.length === 0 &&
    weeklyGoalsForChecklist.length === 0
  ) {
    return null; //do not render the quarter section at all
  }

  // Calculate if all daily goals are complete
  const allDailyGoals = weeklyGoals.flatMap((weekly) =>
    weekly.children.filter(
      (daily) => daily.state?.daily?.dayOfWeek === dayOfWeek
    )
  );
  const isSoftComplete =
    allDailyGoals.length > 0 &&
    allDailyGoals.every((goal) => goal.state?.isComplete);

  return (
    <div className="mb-2">
      <div
        className={cn(
          'rounded-md px-3 py-2 transition-colors',
          isSoftComplete ? 'bg-green-50' : '',
          isPinned ? 'bg-blue-50' : '',
          isStarred && !isPinned ? 'bg-yellow-50' : '',
          !isStarred && !isPinned && !isSoftComplete ? 'bg-white' : ''
        )}
      >
        <QuarterlyGoalHeader
          goal={quarterlyGoal}
          onUpdateTitle={onUpdateTitle}
        />

        {mode === 'focus' && weeklyGoalsForChecklist.length > 0 && (
          <div className="ml-1 mb-3 space-y-1 border-b border-gray-100 pb-2">
            <div className="text-xs text-gray-500 mb-1">Weekly Goals</div>
            {weeklyGoalsForChecklist.map((weeklyGoal) => (
              <WeeklyGoalItem
                key={weeklyGoal._id.toString()}
                goal={weeklyGoal}
                onUpdateTitle={onUpdateTitle}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}

        <div className="space-y-2 ml-1">
          {weeklyGoalsForQuarterlySection.map((weeklyGoal) => (
            <WeeklyGoalSection
              key={weeklyGoal._id.toString()}
              weeklyGoal={weeklyGoal}
              dayOfWeek={dayOfWeek}
              mode={mode}
              sortDailyGoals={sortDailyGoals}
              onUpdateTitle={onUpdateTitle}
              onDelete={onDelete}
              onCreateGoal={onCreateGoal}
              isCreating={isCreating}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

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
  mode?: DayContainerMode;
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
  mode = 'plan',
}: DayContainerProps) => {
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
          ([quarterlyId, { quarterlyGoal, weeklyGoals }]) => (
            <QuarterlyGoalSection
              key={quarterlyId}
              quarterlyGoal={quarterlyGoal}
              weeklyGoals={weeklyGoals}
              dayOfWeek={dayOfWeek}
              mode={mode}
              sortDailyGoals={sortDailyGoals}
              onUpdateTitle={onUpdateGoalTitle}
              onDelete={onDeleteGoal}
              onCreateGoal={onCreateGoal}
              isCreating={isCreating}
            />
          )
        )}
      </div>
    </div>
  );
};
