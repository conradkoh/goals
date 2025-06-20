import { DailyGoalTaskItem } from '@/components/organisms/DailyGoalTaskItem';
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
import {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
  Fragment,
} from 'react';
import { AddTaskInput } from '@/components/atoms/AddTaskInput';
import { DayHeader } from '../components/DayHeader';
import {
  GoalDetailsContent,
  GoalDetailsPopover,
} from '@/components/molecules/goal-details';
import { QuarterlyGoalHeader } from '../components/QuarterlyGoalHeader';
import { WeeklyGoalTaskItem } from '../components/WeeklyGoalTaskItem';
import { ConditionalRender } from '@/components/atoms/ConditionalRender';
import { FireGoalsProvider, useFireGoals } from '@/contexts/FireGoalsContext';

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
  sortDailyGoals?: (
    goals: GoalWithDetailsAndChildren[]
  ) => GoalWithDetailsAndChildren[];
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
  onCreateDailyGoal: (
    weeklyGoalId: Id<'goals'>,
    title: string,
    forDayOfWeek?: DayOfWeek
  ) => Promise<void>;
  onCreateWeeklyGoal: (
    quarterlyGoalId: Id<'goals'>,
    title: string
  ) => Promise<void>;
  isCreating: Record<string, boolean>;
}

const WeeklyGoalSection = ({
  weeklyGoal,
  dayOfWeek,
  mode,
  sortDailyGoals = (goals) =>
    goals.sort((a, b) => a.title.localeCompare(b.title)),
  onUpdateTitle,
  onDelete,
  onCreateDailyGoal,
  onCreateWeeklyGoal,
  isCreating,
}: WeeklyGoalSectionProps) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

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

  // Handle saving edits
  const handleSave = useCallback(
    async (title: string, details?: string) => {
      await onUpdateTitle(weeklyGoal._id, title, details);
    },
    [weeklyGoal._id, onUpdateTitle]
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

  // Determine if we should show the add task input
  // In focus mode, always show. In plan mode, only show when the user is adding a task
  const shouldShowAddTask = mode === 'focus' || isAddingTask;

  return (
    <div>
      <GoalDetailsPopover
        goal={weeklyGoal}
        onSave={handleSave}
        triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
      />

      <div className="space-y-1">
        {sortedDailyGoals.map((dailyGoal) => (
          <div key={dailyGoal._id.toString()} className="ml-1">
            <DailyGoalTaskItem
              goal={dailyGoal}
              onUpdateTitle={onUpdateTitle}
              onDelete={() => onDelete(dailyGoal._id)}
            />
          </div>
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
  onCreateDailyGoal: (
    weeklyGoalId: Id<'goals'>,
    title: string,
    forDayOfWeek?: DayOfWeek
  ) => Promise<void>;
  onCreateWeeklyGoal: (
    quarterlyGoalId: Id<'goals'>,
    title: string
  ) => Promise<void>;
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

  const { weeklyGoalsForChecklist, weeklyGoalsForQuarterlySection } =
    useMemo(() => {
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

          const completedAt = weekly.completedAt
            ? DateTime.fromMillis(weekly.completedAt)
            : null;

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
          weekly.children.some(
            (daily) => daily.state?.daily?.dayOfWeek === dayOfWeek
          )
        ),
      };
    }, [weeklyGoals, mode, dayOfWeek]);

  // Calculate if all daily goals are complete
  const allDailyGoals = useMemo(
    () =>
      weeklyGoals.flatMap((weekly) =>
        weekly.children.filter(
          (daily) => daily.state?.daily?.dayOfWeek === dayOfWeek
        )
      ),
    [weeklyGoals, dayOfWeek]
  );

  const isSoftComplete = useMemo(
    () =>
      allDailyGoals.length > 0 &&
      allDailyGoals.every((goal) => goal.isComplete),
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
        <ConditionalRender condition={mode === 'focus'}>
          {/* this adhoc checklist always renders in the focus mode */}
          <div className="ml-1 space-y-1 border-b border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Weekly Tasks</div>
            {weeklyGoalsForChecklist.map((weeklyGoal) => (
              <WeeklyGoalTaskItem
                key={weeklyGoal._id.toString()}
                goal={weeklyGoal}
                onUpdateTitle={onUpdateTitle}
              />
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
              onUpdateTitle={onUpdateTitle}
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
  onUpdateGoalTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  onCreateDailyGoal: (
    weeklyGoalId: Id<'goals'>,
    title: string,
    forDayOfWeek?: DayOfWeek
  ) => Promise<void>;
  onCreateWeeklyGoal: (
    quarterlyGoalId: Id<'goals'>,
    title: string
  ) => Promise<void>;
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
  onCreateDailyGoal,
  onCreateWeeklyGoal,
  isCreating = {},
  sortDailyGoals,
  mode = 'plan',
}: DayContainerProps) => {
  // Memoize the callback functions to prevent unnecessary re-renders
  const handleUpdateGoalTitle = useCallback(
    (goalId: Id<'goals'>, title: string, details?: string) => {
      return onUpdateGoalTitle(goalId, title, details);
    },
    [onUpdateGoalTitle]
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

    // Group by quarterly goals first
    weeklyGoalsWithQuarterly.forEach(({ weeklyGoal, quarterlyGoal }) => {
      const quarterlyId = quarterlyGoal._id.toString();
      if (!map.has(quarterlyId)) {
        map.set(quarterlyId, {
          quarterlyGoal,
          weeklyGoals: [],
        });
      }
      map.get(quarterlyId)!.weeklyGoals.push(weeklyGoal);
    });

    return map;
  }, [weeklyGoalsWithQuarterly]);

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
              onUpdateTitle={handleUpdateGoalTitle}
              onDelete={handleDeleteGoal}
              onCreateDailyGoal={handleCreateDailyGoal}
              onCreateWeeklyGoal={handleCreateWeeklyGoal}
              isCreating={isCreating}
            />
          )
        )}
      </div>
    </div>
  );
};
