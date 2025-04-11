import { Button } from '@/components/ui/button';
import { SafeHTML } from '@/components/ui/safe-html';
import { cn } from '@/lib/utils';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Check, Edit2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { DeleteGoalIconButton } from '../../atoms/DeleteGoalIconButton';
import { GoalEditPopover } from '../../atoms/GoalEditPopover';
import { GoalStarPin, GoalStarPinContainer } from '../../atoms/GoalStarPin';
import { Checkbox } from '@/components/ui/checkbox';
import { useWeek } from '@/hooks/useWeek';
import {
  GoalDetailsContent,
  GoalDetailsPopover,
} from '@/components/molecules/goal-details';

interface QuarterlyGoalProps {
  goal: GoalWithDetailsAndChildren;
  onToggleStatus: (
    goalId: Id<'goals'>,
    isStarred: boolean,
    isPinned: boolean
  ) => Promise<void>;
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
}

export function QuarterlyGoal({
  goal,
  onToggleStatus,
  onUpdateTitle,
}: QuarterlyGoalProps) {
  const { toggleGoalCompletion, weekNumber } = useWeek();
  const isComplete = goal.isComplete;
  const isAllWeeklyGoalsComplete =
    goal.children.length > 0 &&
    goal.children.every((child) => child.isComplete);

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

  const handleSaveTitle = useCallback(
    async (title: string, details?: string) => {
      await onUpdateTitle(goal._id, title, details);
    },
    [goal._id, onUpdateTitle]
  );

  return (
    <>
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

          {/* View Mode */}
          <GoalDetailsPopover
            goal={goal}
            onSave={handleSaveTitle}
            triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
            titleClassName="text-gray-600 flex items-center"
            onToggleComplete={handleToggleCompletion}
          />

          {/* Edit Mode */}
          <GoalEditPopover
            title={goal.title}
            details={goal.details || ''}
            onSave={handleSaveTitle}
            trigger={
              <button className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-foreground">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            }
          />

          {/* Delete Button */}
          <DeleteGoalIconButton goalId={goal._id} requireConfirmation={true} />
        </div>
      </div>
    </>
  );
}
