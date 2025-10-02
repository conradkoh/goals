import type { Id } from '@services/backend/convex/_generated/dataModel';
import { Edit2 } from 'lucide-react';
import { useCallback } from 'react';
import { FireIcon } from '@/components/atoms/FireIcon';
import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { PendingIcon } from '@/components/atoms/PendingIcon';
import { GoalDetailsPopover } from '@/components/molecules/goal-details';
import { DeleteGoalIconButton } from '@/components/organisms/DeleteGoalIconButton';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { useFireGoalStatus } from '@/contexts/GoalStatusContext';
import { type GoalWithOptimisticStatus, useWeek } from '@/hooks/useWeek';

/**
 * Props for the weekly goal task item component.
 */
export interface WeeklyGoalTaskItemProps {
  goal: GoalWithOptimisticStatus;
  onUpdateTitle: (goalId: Id<'goals'>, title: string, details?: string) => Promise<void>;
}

/**
 * Displays a weekly goal as a task item with completion checkbox and action buttons.
 */
export const WeeklyGoalTaskItem = ({ goal, onUpdateTitle }: WeeklyGoalTaskItemProps) => {
  const { toggleGoalCompletion } = useWeek();
  const { weekNumber: currentWeekNumber } = useWeek();
  const isComplete = goal.isComplete;

  const { isOnFire, toggleFireStatus } = useFireGoalStatus(goal._id);

  /**
   * Handles toggling the completion status of the goal.
   */
  const _handleToggleCompletion = useCallback(
    async (newState: boolean) => {
      await toggleGoalCompletion({
        goalId: goal._id,
        weekNumber: currentWeekNumber,
        isComplete: newState,
        updateChildren: false,
      });

      if (newState && isOnFire) {
        toggleFireStatus(goal._id);
      }
    },
    [toggleGoalCompletion, goal._id, currentWeekNumber, isOnFire, toggleFireStatus]
  );

  /**
   * Handles updating the goal title and details.
   */
  const _handleUpdateTitle = useCallback(
    async (title: string, details?: string) => {
      await onUpdateTitle(goal._id, title, details);
    },
    [onUpdateTitle, goal._id]
  );

  /**
   * Handles checkbox change events for goal completion.
   */
  const _handleCheckboxChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      _handleToggleCompletion(checked === true);
    },
    [_handleToggleCompletion]
  );

  return (
    <div className="weekly-goal-item ml-1 group rounded-sm hover:bg-gray-50/50">
      <div>
        <div className="text-sm flex items-center gap-2 group/title">
          <Checkbox
            checked={isComplete}
            onCheckedChange={_handleCheckboxChange}
            className="flex-shrink-0"
          />

          <GoalDetailsPopover
            goal={goal}
            onSave={_handleUpdateTitle}
            triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
            onToggleComplete={_handleToggleCompletion}
          />

          <div className="flex items-center gap-1">
            {goal.isOptimistic ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                <FireIcon goalId={goal._id} />
                <PendingIcon goalId={goal._id} />
                <GoalEditPopover
                  title={goal.title}
                  details={goal.details}
                  onSave={_handleUpdateTitle}
                  trigger={
                    <button
                      type="button"
                      className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                <DeleteGoalIconButton requireConfirmation={false} goalId={goal._id} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
