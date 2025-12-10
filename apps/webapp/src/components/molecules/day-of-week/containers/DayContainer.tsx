import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { DateTime } from 'luxon';
import { useCallback, useMemo, useState } from 'react';
import { AddTaskInput } from '@/components/atoms/AddTaskInput';
import { ConditionalRender } from '@/components/atoms/ConditionalRender';
import { WeeklyGoalPopover } from '@/components/molecules/goal-details-popover';
import { DailyGoalTaskItem } from '@/components/organisms/DailyGoalTaskItem';
import { GoalProvider } from '@/contexts/GoalContext';
import type { DayOfWeek } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { DayHeader } from '../components/DayHeader';
import { QuarterlyGoalHeader } from '../components/QuarterlyGoalHeader';
import { WeeklyGoalTaskItem } from '../components/WeeklyGoalTaskItem';

// Helper function to check if a goal was completed today
export const wasCompletedToday = (
  goal: GoalWithDetailsAndChildren,
  dateTimestamp: number
): boolean => {
  if (!goal.isComplete || !goal.completedAt) return false;
  const completedAt = DateTime.fromMillis(goal.completedAt);
  const date = DateTime.fromMillis(dateTimestamp);
  return (
    completedAt.get('year') === date.get('year') &&
    completedAt.get('quarter') === date.get('quarter') &&
    completedAt.get('weekNumber') === date.get('weekNumber') &&
    completedAt.get('day') === date.get('day')
  );
};

export type DayContainerMode = 'plan' | 'focus';

interface WeeklyGoalSectionProps {
  weeklyGoal: GoalWithDetailsAndChildren;
  dayOfWeek: DayOfWeek;
  mode: DayContainerMode;
  sortDailyGoals?: (goals: GoalWithDetailsAndChildren[]) => GoalWithDetailsAndChildren[];
  onUpdateGoal: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
  onCreateDailyGoal: (
    weeklyGoalId: Id<'goals'>,
    title: string,
    forDayOfWeek?: DayOfWeek
  ) => Promise<void>;
  onCreateWeeklyGoal: (quarterlyGoalId: Id<'goals'>, title: string) => Promise<void>;
  isCreating: Record<string, boolean>;
}

const WeeklyGoalSection = ({
  weeklyGoal,
  dayOfWeek,
  mode,
  sortDailyGoals = (goals) => goals.sort((a, b) => (a._creationTime ?? 0) - (b._creationTime ?? 0)),
  onUpdateGoal,
  onDelete,
  onCreateDailyGoal,
  onCreateWeeklyGoal,
  isCreating,
}: WeeklyGoalSectionProps) => {
  // Suppress unused parameter warnings - kept for API compatibility
  void onDelete;
  void onCreateWeeklyGoal;
  void isCreating;

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Handle saving edits
  const handleSave = useCallback(
    async (title: string, details?: string, dueDate?: number) => {
      await onUpdateGoal(weeklyGoal._id, title, details, dueDate);
    },
    [weeklyGoal._id, onUpdateGoal]
  );

  // Handle creating a new daily goal
  const handleCreateGoal = useCallback(async () => {
    if (newTaskTitle.trim() === '') return;
    setIsAddingTask(true);
    try {
      await onCreateDailyGoal(weeklyGoal._id, newTaskTitle.trim());
      setNewTaskTitle('');
    } catch (error) {
      console.error('Failed to create daily goal', error);
    } finally {
      setIsAddingTask(false);
    }
  }, [weeklyGoal._id, newTaskTitle, onCreateDailyGoal]);
  // Ensure handleCreateGoal is available for potential use
  void handleCreateGoal;

  // Filter daily goals for this day of week
  const dailyGoals = weeklyGoal.children.filter(
    (dailyGoal) => dailyGoal.state?.daily?.dayOfWeek === dayOfWeek
  );

  // In 'focus' mode, we only show weekly goals that have daily goals for today
  // In 'plan' mode, we show all weekly goals
  if (mode === 'focus' && dailyGoals.length === 0) {
    return null;
  }

  // Get sorted daily goals
  const sortedDailyGoals = sortDailyGoals(dailyGoals);

  // Determine if we should show the add task input
  // In focus mode, always show. In plan mode, only show when the user is adding a task
  const shouldShowAddTask = mode === 'focus' || isAddingTask;

  return (
    <GoalProvider goal={weeklyGoal}>
      <div>
        {/* WeeklyGoalPopover gets goal from context */}
        <WeeklyGoalPopover
          onSave={handleSave}
          triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
        />

        <div className="space-y-1">
          {sortedDailyGoals.map((dailyGoal) => (
            <GoalProvider key={dailyGoal._id.toString()} goal={dailyGoal}>
              <div className="ml-1">
                {/* DailyGoalTaskItem gets goal from context */}
                <DailyGoalTaskItem />
              </div>
            </GoalProvider>
          ))}

          {shouldShowAddTask && (
            <AddTaskInput
              parentGoalId={weeklyGoal._id}
              isOptimistic={true}
              onCreateGoal={onCreateDailyGoal}
              forDayOfWeek={dayOfWeek}
            />
          )}
        </div>
      </div>
    </GoalProvider>
  );
};

interface QuarterlyGoalSectionProps {
  quarterlyGoal: GoalWithDetailsAndChildren;
  weeklyGoals: GoalWithDetailsAndChildren[];
  dayOfWeek: DayOfWeek;
  mode: DayContainerMode;
  sortDailyGoals?: (goals: GoalWithDetailsAndChildren[]) => GoalWithDetailsAndChildren[];
  onUpdateGoal: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
  onCreateDailyGoal: (
    weeklyGoalId: Id<'goals'>,
    title: string,
    forDayOfWeek?: DayOfWeek
  ) => Promise<void>;
  onCreateWeeklyGoal: (quarterlyGoalId: Id<'goals'>, title: string) => Promise<void>;
  isCreating: Record<string, boolean>;
}

const QuarterlyGoalSection = ({
  quarterlyGoal,
  weeklyGoals,
  dayOfWeek,
  mode,
  sortDailyGoals,
  onUpdateGoal,
  onDelete,
  onCreateDailyGoal,
  onCreateWeeklyGoal,
  isCreating,
}: QuarterlyGoalSectionProps) => {
  const isStarred = useMemo(
    () => quarterlyGoal.state?.isStarred ?? false,
    [quarterlyGoal.state?.isStarred]
  );

  const isPinned = useMemo(
    () => quarterlyGoal.state?.isPinned ?? false,
    [quarterlyGoal.state?.isPinned]
  );

  const { weeklyGoalsForChecklist, weeklyGoalsForQuarterlySection } = useMemo(() => {
    // In plan mode, show all weekly goals
    if (mode === 'plan') {
      return {
        weeklyGoalsForChecklist: weeklyGoals.filter((weekly) => {
          if (!weekly.state) return false;
          // Only show goals without children in the checklist
          return weekly.children.length === 0;
        }),
        weeklyGoalsForQuarterlySection: weeklyGoals,
      };
    }

    // In focus mode, filter weekly goals
    return {
      weeklyGoalsForChecklist: weeklyGoals.filter((weekly) => {
        if (!weekly.state) return false;
        // exclusion condition 1: weekly goal has children in the week
        const hasChildrenInWeek = weekly.children.length > 0;
        if (hasChildrenInWeek) return false;

        const completedAt = weekly.completedAt ? DateTime.fromMillis(weekly.completedAt) : null;

        //exclusion condition 2: weekly goal is complete but no completion date (for legacy records)
        if (weekly.isComplete && !completedAt) {
          return false;
        }
        // exclusion condition 3: weekly goal is complete in a day other than the current day
        const isCompleteInOtherDays =
          weekly.isComplete &&
          completedAt &&
          completedAt?.get('year') === DateTime.now().get('year') &&
          completedAt?.get('quarter') === DateTime.now().get('quarter') &&
          completedAt?.get('weekNumber') !== DateTime.now().get('weekNumber');
        if (isCompleteInOtherDays) return false;

        return true;
      }),
      weeklyGoalsForQuarterlySection: weeklyGoals.filter((weekly) =>
        weekly.children.some((daily) => daily.state?.daily?.dayOfWeek === dayOfWeek)
      ),
    };
  }, [weeklyGoals, mode, dayOfWeek]);

  // Calculate if all daily goals are complete
  const allDailyGoals = useMemo(
    () =>
      weeklyGoals.flatMap((weekly) =>
        weekly.children.filter((daily) => daily.state?.daily?.dayOfWeek === dayOfWeek)
      ),
    [weeklyGoals, dayOfWeek]
  );

  const isSoftComplete = useMemo(
    () => allDailyGoals.length > 0 && allDailyGoals.every((goal) => goal.isComplete),
    [allDailyGoals]
  );

  // Check if there are goals to display in focus mode
  const shouldRender = useMemo(() => {
    if (mode !== 'focus') return true;
    // In focus mode, always render the quarterly goal section
    return true;
  }, [mode]);

  // Early return if nothing to render
  if (!shouldRender) {
    return null;
  }
  return (
    <div className="mb-2">
      <div
        className={cn(
          'rounded-md px-3 py-2 transition-colors',
          isSoftComplete ? 'bg-green-50 dark:bg-green-950/20' : '',
          isPinned ? 'bg-blue-50 dark:bg-blue-950/20' : '',
          isStarred && !isPinned ? 'bg-yellow-50 dark:bg-yellow-950/20' : '',
          !isStarred && !isPinned && !isSoftComplete ? 'bg-card' : ''
        )}
      >
        <QuarterlyGoalHeader goal={quarterlyGoal} onUpdateGoal={onUpdateGoal} />
        <ConditionalRender condition={mode === 'focus'}>
          {/* this adhoc checklist always renders in the focus mode */}
          <div className="ml-1 space-y-1 border-b border-border">
            <div className="text-xs text-muted-foreground mb-1">Weekly Tasks</div>
            {weeklyGoalsForChecklist.map((weeklyGoal) => (
              <GoalProvider key={weeklyGoal._id.toString()} goal={weeklyGoal}>
                {/* WeeklyGoalTaskItem gets goal from context */}
                <WeeklyGoalTaskItem />
              </GoalProvider>
            ))}
            <AddTaskInput
              parentGoalId={quarterlyGoal._id}
              isOptimistic={true}
              onCreateGoal={onCreateWeeklyGoal}
            />
          </div>
        </ConditionalRender>

        <div className="space-y-2 ml-1">
          {weeklyGoalsForQuarterlySection.map((weeklyGoal) => (
            <WeeklyGoalSection
              key={weeklyGoal._id.toString()}
              weeklyGoal={weeklyGoal}
              dayOfWeek={dayOfWeek}
              mode={mode}
              sortDailyGoals={sortDailyGoals}
              onUpdateGoal={onUpdateGoal}
              onDelete={onDelete}
              onCreateDailyGoal={onCreateDailyGoal}
              onCreateWeeklyGoal={onCreateWeeklyGoal}
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
  /**
   * Quarterly goals that should always be displayed, even if they have no weekly tasks.
   * Typically used for starred and pinned quarterly goals to ensure they're always visible.
   */
  alwaysShowQuarterlyGoals?: GoalWithDetailsAndChildren[];
  onUpdateGoal: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  onCreateDailyGoal: (
    weeklyGoalId: Id<'goals'>,
    title: string,
    forDayOfWeek?: DayOfWeek
  ) => Promise<void>;
  onCreateWeeklyGoal: (quarterlyGoalId: Id<'goals'>, title: string) => Promise<void>;
  isCreating?: Record<string, boolean>;
  sortDailyGoals?: (goals: GoalWithDetailsAndChildren[]) => GoalWithDetailsAndChildren[];
  mode?: DayContainerMode;
}

export const DayContainer = ({
  dayOfWeek,
  weekNumber,
  dateTimestamp,
  weeklyGoalsWithQuarterly,
  alwaysShowQuarterlyGoals = [],
  onUpdateGoal,
  onDeleteGoal,
  onCreateDailyGoal,
  onCreateWeeklyGoal,
  isCreating = {},
  sortDailyGoals,
  mode = 'plan',
}: DayContainerProps) => {
  // Memoize the callback functions to prevent unnecessary re-renders
  const handleUpdateGoal = useCallback(
    (goalId: Id<'goals'>, title: string, details?: string, dueDate?: number) => {
      return onUpdateGoal(goalId, title, details, dueDate);
    },
    [onUpdateGoal]
  );

  const handleDeleteGoal = useCallback(
    (goalId: Id<'goals'>) => {
      return onDeleteGoal(goalId);
    },
    [onDeleteGoal]
  );

  const handleCreateDailyGoal = useCallback(
    (weeklyGoalId: Id<'goals'>, title: string) => {
      return onCreateDailyGoal(weeklyGoalId, title, dayOfWeek);
    },
    [onCreateDailyGoal, dayOfWeek]
  );

  const handleCreateWeeklyGoal = useCallback(
    (quarterlyGoalId: Id<'goals'>, title: string) => {
      return onCreateWeeklyGoal(quarterlyGoalId, title);
    },
    [onCreateWeeklyGoal]
  );

  // First, get unique quarterly goals and their associated weekly goals
  // Memoize the quarterly goals map to prevent unnecessary recalculations
  const quarterlyGoalsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        quarterlyGoal: GoalWithDetailsAndChildren;
        weeklyGoals: GoalWithDetailsAndChildren[];
      }
    >();

    // Initialize with always-show quarterly goals (starred/pinned) first
    // This ensures they appear even if they have no weekly goals
    alwaysShowQuarterlyGoals.forEach((quarterlyGoal) => {
      const quarterlyId = quarterlyGoal._id.toString();
      if (!map.has(quarterlyId)) {
        map.set(quarterlyId, {
          quarterlyGoal,
          weeklyGoals: [],
        });
      }
    });

    // Group by quarterly goals and add weekly goals
    weeklyGoalsWithQuarterly.forEach(({ weeklyGoal, quarterlyGoal }) => {
      const quarterlyId = quarterlyGoal._id.toString();
      if (!map.has(quarterlyId)) {
        map.set(quarterlyId, {
          quarterlyGoal,
          weeklyGoals: [],
        });
      }
      map.get(quarterlyId)?.weeklyGoals.push(weeklyGoal);
    });

    return map;
  }, [weeklyGoalsWithQuarterly, alwaysShowQuarterlyGoals]);

  // Sort the quarterly goals: starred first, then pinned, then the rest
  const sortedQuarterlyEntries = useMemo(
    () =>
      Array.from(quarterlyGoalsMap.entries()).sort(([, a], [, b]) => {
        const aIsStarred = a.quarterlyGoal.state?.isStarred ?? false;
        const aIsPinned = a.quarterlyGoal.state?.isPinned ?? false;
        const bIsStarred = b.quarterlyGoal.state?.isStarred ?? false;
        const bIsPinned = b.quarterlyGoal.state?.isPinned ?? false;

        if (aIsStarred && !bIsStarred) return -1;
        if (!aIsStarred && bIsStarred) return 1;
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;

        return a.quarterlyGoal.title.localeCompare(b.quarterlyGoal.title);
      }),
    [quarterlyGoalsMap]
  );

  return (
    <div className="space-y-2 mb-1 border-b border-border last:border-b-0">
      <DayHeader dayOfWeek={dayOfWeek} weekNumber={weekNumber} dateTimestamp={dateTimestamp} />
      <div className="space-y-2">
        {sortedQuarterlyEntries.map(([quarterlyId, { quarterlyGoal, weeklyGoals }]) => (
          <QuarterlyGoalSection
            key={quarterlyId}
            quarterlyGoal={quarterlyGoal}
            weeklyGoals={weeklyGoals}
            dayOfWeek={dayOfWeek}
            mode={mode}
            sortDailyGoals={sortDailyGoals}
            onUpdateGoal={handleUpdateGoal}
            onDelete={handleDeleteGoal}
            onCreateDailyGoal={handleCreateDailyGoal}
            onCreateWeeklyGoal={handleCreateWeeklyGoal}
            isCreating={isCreating}
          />
        ))}
      </div>
    </div>
  );
};
