import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Check, Pin, Star } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { GoalDetailsPopover } from '@/components/molecules/goal-details';
import { Spinner } from '@/components/ui/spinner';
import { GoalProvider } from '@/contexts/GoalContext';
import { useWeek } from '@/hooks/useWeek';
import type { DayOfWeekType } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { CreateGoalInput } from '../atoms/CreateGoalInput';
import { DailyGoalTaskItem } from './DailyGoalTaskItem';

export interface DailyGoalListProps {
  goals: GoalWithDetailsAndChildren[];
  className?: string;
}

export const DailyGoalList = ({ goals, className }: DailyGoalListProps) => {
  return (
    <div className={className}>
      {goals.map((goal) => (
        <GoalProvider key={goal._id} goal={goal}>
          {/* DailyGoalTaskItem gets goal from context */}
          <DailyGoalTaskItem />
        </GoalProvider>
      ))}
    </div>
  );
};

export interface DailyGoalListContainerProps {
  goals: GoalWithDetailsAndChildren[];
  onUpdateGoal: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  onCreateGoal: (title: string) => Promise<void>;
  className?: string;
  createInputPlaceholder?: string;
  isCreating?: boolean;
  children?: React.ReactNode;
}

export const DailyGoalListContainer = ({
  goals,
  onCreateGoal,
  className,
  createInputPlaceholder = 'Add a goal...',
  isCreating = false,
  children,
}: DailyGoalListContainerProps) => {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleSubmit = async () => {
    if (!newGoalTitle.trim()) return;
    const titleToCreate = newGoalTitle.trim();
    setNewGoalTitle(''); // Clear input immediately for better UX
    await onCreateGoal(titleToCreate);
  };

  const handleEscape = () => {
    setIsInputFocused(false);
    setNewGoalTitle('');
  };

  return (
    <div className={cn('space-y-2', className)}>
      <DailyGoalList goals={goals} />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Mouse interactions are needed for visibility control */}
      <div
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => !isInputFocused && setIsHovering(false)}
      >
        <div
          className={cn(
            'transition-opacity duration-150',
            isInputFocused || isHovering
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          )}
        >
          <div className="relative">
            <CreateGoalInput
              placeholder={createInputPlaceholder}
              value={newGoalTitle}
              onChange={setNewGoalTitle}
              onSubmit={handleSubmit}
              onEscape={handleEscape}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => {
                if (!newGoalTitle) {
                  setIsInputFocused(false);
                  setIsHovering(false);
                }
              }}
              autoFocus={isInputFocused}
              disabled={isCreating}
            >
              {children}
              {isCreating && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Spinner className="h-4 w-4" />
                </div>
              )}
            </CreateGoalInput>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface DailyGoalGroupHeaderProps {
  weeklyGoal: GoalWithDetailsAndChildren;
  quarterlyGoal: GoalWithDetailsAndChildren;
  onUpdateGoal: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
}

export const DailyGoalGroupHeader = ({
  weeklyGoal,
  quarterlyGoal,
  onUpdateGoal,
}: DailyGoalGroupHeaderProps) => {
  const { toggleGoalCompletion, weekNumber } = useWeek();
  const isStarred = quarterlyGoal.state?.isStarred ?? false;
  const isPinned = quarterlyGoal.state?.isPinned ?? false;
  const isComplete = quarterlyGoal.isComplete;

  const handleToggleCompletion = useCallback(
    async (newState: boolean) => {
      await toggleGoalCompletion({
        goalId: quarterlyGoal._id,
        weekNumber,
        isComplete: newState,
        updateChildren: false,
      });
    },
    [quarterlyGoal._id, weekNumber, toggleGoalCompletion]
  );

  const handleSaveWeeklyGoal = useCallback(
    async (title: string, details?: string, dueDate?: number) => {
      await onUpdateGoal(weeklyGoal._id, title, details, dueDate);
    },
    [weeklyGoal._id, onUpdateGoal]
  );

  const handleSaveQuarterlyGoal = useCallback(
    async (title: string, details?: string, dueDate?: number) => {
      await onUpdateGoal(quarterlyGoal._id, title, details, dueDate);
    },
    [quarterlyGoal._id, onUpdateGoal]
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <GoalProvider goal={weeklyGoal}>
          {/* GoalDetailsPopover gets goal from context */}
          <GoalDetailsPopover
            onSave={handleSaveWeeklyGoal}
            triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
            onToggleComplete={async (newState) => {
              await toggleGoalCompletion({
                goalId: weeklyGoal._id,
                weekNumber,
                isComplete: newState,
                updateChildren: false,
              });
            }}
          />
        </GoalProvider>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        {isStarred && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
        {isPinned && <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />}
        {isComplete && <Check className="h-3.5 w-3.5 text-green-500" />}
        <GoalProvider goal={quarterlyGoal}>
          {/* GoalDetailsPopover gets goal from context */}
          <GoalDetailsPopover
            onSave={handleSaveQuarterlyGoal}
            triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
            onToggleComplete={handleToggleCompletion}
          />
        </GoalProvider>
      </div>
    </div>
  );
};

export interface DailyGoalGroupContainerProps {
  weeklyGoal: GoalWithDetailsAndChildren;
  quarterlyGoal: GoalWithDetailsAndChildren;
  dayOfWeek: DayOfWeekType;
  onUpdateGoal: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
  onDeleteGoal: (goalId: Id<'goals'>) => Promise<void>;
  onCreateGoal: (title: string) => Promise<void>;
  isCreating?: boolean;
  sortGoals?: (goals: GoalWithDetailsAndChildren[]) => GoalWithDetailsAndChildren[];
}

export const DailyGoalGroupContainer = ({
  weeklyGoal,
  quarterlyGoal,
  dayOfWeek,
  onUpdateGoal,
  onDeleteGoal,
  onCreateGoal,
  isCreating = false,
  sortGoals = (goals) => goals.sort((a, b) => a.title.localeCompare(b.title)),
}: DailyGoalGroupContainerProps) => {
  const dailyGoals = useMemo(
    () =>
      weeklyGoal.children.filter((dailyGoal) => dailyGoal.state?.daily?.dayOfWeek === dayOfWeek),
    [weeklyGoal.children, dayOfWeek]
  );

  const sortedDailyGoals = useMemo(() => sortGoals(dailyGoals), [dailyGoals, sortGoals]);

  const isSoftComplete = useMemo(
    () => sortedDailyGoals.length > 0 && sortedDailyGoals.every((goal) => goal.isComplete),
    [sortedDailyGoals]
  );

  const handleUpdateGoal = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string, dueDate?: number) => {
      await onUpdateGoal(goalId, title, details, dueDate);
    },
    [onUpdateGoal]
  );

  const handleDeleteGoal = useCallback(
    async (goalId: Id<'goals'>) => {
      await onDeleteGoal(goalId);
    },
    [onDeleteGoal]
  );

  const handleCreateGoal = useCallback(
    async (title: string) => {
      await onCreateGoal(title);
    },
    [onCreateGoal]
  );

  return (
    <div>
      <div
        className={cn(
          'rounded-md px-3 py-2 transition-colors',
          isSoftComplete ? 'bg-green-50' : ''
        )}
      >
        <DailyGoalGroupHeader
          weeklyGoal={weeklyGoal}
          quarterlyGoal={quarterlyGoal}
          onUpdateGoal={handleUpdateGoal}
        />
        <DailyGoalListContainer
          goals={sortedDailyGoals}
          onUpdateGoal={handleUpdateGoal}
          onDeleteGoal={handleDeleteGoal}
          onCreateGoal={handleCreateGoal}
          createInputPlaceholder="Add a task..."
          isCreating={isCreating}
        />
      </div>
    </div>
  );
};
