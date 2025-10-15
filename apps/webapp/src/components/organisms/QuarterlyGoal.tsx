import type { Id } from '@services/backend/convex/_generated/dataModel';
import { Edit2 } from 'lucide-react';
import { useCallback } from 'react';
import { GoalDetailsPopover } from '@/components/molecules/goal-details';
import { useGoalContext } from '@/contexts/GoalContext';
import { useWeek } from '@/hooks/useWeek';
import { getDueDateStyle } from '@/lib/date/getDueDateStyle';
import { cn } from '@/lib/utils';
import type { GoalUpdateHandler } from '@/models/goal-handlers';
import { GoalEditPopover } from '../atoms/GoalEditPopover';
import { GoalStarPin, GoalStarPinContainer } from '../atoms/GoalStarPin';
import { DeleteGoalIconButton } from './DeleteGoalIconButton';

interface QuarterlyGoalProps {
  onToggleStatus: (goalId: Id<'goals'>, isStarred: boolean, isPinned: boolean) => Promise<void>;
  onUpdateGoal: GoalUpdateHandler;
}

export function QuarterlyGoal({ onToggleStatus, onUpdateGoal }: QuarterlyGoalProps) {
  const { goal } = useGoalContext();
  const { toggleGoalCompletion, weekNumber } = useWeek();
  const isComplete = goal.isComplete;
  const isAllWeeklyGoalsComplete =
    goal.children.length > 0 && goal.children.every((child) => child.isComplete);

  const handleToggleStar = useCallback(() => {
    onToggleStatus(
      goal._id as Id<'goals'>,
      !goal.state?.isStarred,
      false // Always set pinned to false when starring
    );
  }, [goal._id, goal.state?.isStarred, onToggleStatus]);

  const handleTogglePin = useCallback(() => {
    onToggleStatus(
      goal._id as Id<'goals'>,
      false, // Always set starred to false when pinning
      !goal.state?.isPinned
    );
  }, [goal._id, goal.state?.isPinned, onToggleStatus]);

  const handleToggleCompletion = useCallback(
    async (newState: boolean) => {
      await toggleGoalCompletion({
        goalId: goal._id,
        weekNumber,
        isComplete: newState,
        updateChildren: false,
      });
    },
    [goal._id, weekNumber, toggleGoalCompletion]
  );

  const handleSaveGoal = useCallback(
    async (title: string, details?: string, dueDate?: number) => {
      await onUpdateGoal(goal._id, title, details, dueDate);
    },
    [goal._id, onUpdateGoal]
  );

  return (
    <div
      className={cn(
        'group px-2 py-1 rounded-sm',
        isComplete
          ? 'bg-green-50'
          : isAllWeeklyGoalsComplete
            ? 'bg-green-50/50'
            : 'hover:bg-gray-50'
      )}
    >
      <div className="flex items-center gap-2 group/title">
        <GoalStarPinContainer>
          <GoalStarPin
            value={{
              isStarred: goal.state?.isStarred || false,
              isPinned: goal.state?.isPinned || false,
            }}
            onStarred={handleToggleStar}
            onPinned={handleTogglePin}
          />
        </GoalStarPinContainer>

        {/* View Mode - GoalDetailsPopover gets goal from context */}
        <GoalDetailsPopover
          onSave={handleSaveGoal}
          triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
          titleClassName={cn(
            'text-gray-600 flex items-center',
            getDueDateStyle(goal.dueDate ? new Date(goal.dueDate) : null, goal.isComplete)
          )}
          onToggleComplete={handleToggleCompletion}
        />

        {/* Edit Mode */}
        <GoalEditPopover
          title={goal.title}
          details={goal.details || ''}
          initialDueDate={goal.dueDate}
          onSave={handleSaveGoal}
          trigger={
            <button
              type="button"
              className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-foreground"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          }
        />

        {/* Delete Button */}
        <DeleteGoalIconButton goalId={goal._id} requireConfirmation={true} />
      </div>
    </div>
  );
}
