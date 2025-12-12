import { useCallback } from 'react';
import { WeeklyGoalPopover } from '@/components/molecules/goal-details-popover';
import { useGoalActionsContext } from '@/contexts/GoalActionsContext';
import { useGoalContext } from '@/contexts/GoalContext';
import { useFireGoalStatus } from '@/contexts/GoalStatusContext';
import { isOptimisticId } from '@/hooks/useOptimistic';
import { useWeek } from '@/hooks/useWeek';
import { getDueDateStyle } from '@/lib/date/getDueDateStyle';
import { cn } from '@/lib/utils';
import {
  GoalActionButtons,
  GoalCheckbox,
  GoalListItemProvider,
  GoalPendingIndicator,
  GoalStatusIcons,
  useGoalListItemContext,
} from '../view/components';

export interface WeeklyGoalItemProps {
  /** Additional class names */
  className?: string;
}

/**
 * Weekly goal list item variant.
 * Displays a weekly goal with checkbox, popover trigger, status icons, and action buttons.
 *
 * Must be wrapped with GoalProvider and GoalActionsProvider.
 *
 * @example
 * ```tsx
 * <GoalProvider goal={weeklyGoal}>
 *   <WeeklyGoalItem />
 * </GoalProvider>
 * ```
 */
export function WeeklyGoalItem({ className }: WeeklyGoalItemProps) {
  return (
    <GoalListItemProvider>
      <_WeeklyGoalItemContent className={className} />
    </GoalListItemProvider>
  );
}

interface _WeeklyGoalItemContentProps {
  className?: string;
}

function _WeeklyGoalItemContent({ className }: _WeeklyGoalItemContentProps) {
  const { goal } = useGoalContext();
  const { onUpdateGoal } = useGoalActionsContext();
  const { setPendingUpdate } = useGoalListItemContext();

  const { toggleGoalCompletion, weekNumber } = useWeek();
  const isOptimistic = isOptimisticId(goal._id);

  const { isOnFire, toggleFireStatus } = useFireGoalStatus(goal._id);

  /**
   * Handles toggling the completion status of the goal.
   */
  const handleToggleCompletion = useCallback(
    async (newState: boolean) => {
      await toggleGoalCompletion({
        goalId: goal._id,
        weekNumber,
        isComplete: newState,
        updateChildren: false,
      });

      // If marked complete and was on fire, remove from fire list
      if (newState && isOnFire) {
        toggleFireStatus(goal._id);
      }
    },
    [toggleGoalCompletion, goal._id, weekNumber, isOnFire, toggleFireStatus]
  );

  /**
   * Handles updating the goal title and details.
   */
  const handleUpdateGoal = useCallback(
    async (title: string, details?: string, dueDate?: number) => {
      const updatePromise = onUpdateGoal(goal._id, title, details, dueDate);
      setPendingUpdate(updatePromise);
      return updatePromise;
    },
    [onUpdateGoal, goal._id, setPendingUpdate]
  );

  return (
    <div className={cn('weekly-goal-item ml-1 group rounded-sm hover:bg-accent/50', className)}>
      <div className="text-sm flex items-center gap-2 group/title">
        <GoalCheckbox onToggleComplete={handleToggleCompletion} disabled={isOptimistic} />

        {/* WeeklyGoalPopover gets goal from context */}
        <WeeklyGoalPopover
          onSave={handleUpdateGoal}
          triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
          titleClassName={cn(
            getDueDateStyle(goal.dueDate ? new Date(goal.dueDate) : null, goal.isComplete)
          )}
          onToggleComplete={handleToggleCompletion}
        />

        <GoalPendingIndicator isOptimistic={isOptimistic}>
          <GoalStatusIcons goalId={goal._id} />
          <GoalActionButtons
            onSave={handleUpdateGoal}
            onUpdatePending={setPendingUpdate}
            deleteRequiresConfirmation={false}
          />
        </GoalPendingIndicator>
      </div>
    </div>
  );
}
