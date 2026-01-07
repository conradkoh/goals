import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useCallback } from 'react';

import {
  GoalActionButtons,
  GoalListItemProvider,
  GoalPendingIndicator,
  useGoalListItemContext,
} from '../view/components';

import { GoalStarPin, GoalStarPinContainer } from '@/components/atoms/GoalStarPin';
import { QuarterlyGoalPopover } from '@/components/molecules/goal-details-popover';
import { useGoalContext } from '@/contexts/GoalContext';
import { useWeek } from '@/hooks/useWeek';
import { getDueDateStyle } from '@/lib/date/getDueDateStyle';
import { cn } from '@/lib/utils';
import type { GoalUpdateHandler } from '@/models/goal-handlers';

export interface QuarterlyGoalItemProps {
  /** Handler for toggling star/pin status */
  onToggleStatus: (goalId: Id<'goals'>, isStarred: boolean, isPinned: boolean) => Promise<void>;
  /** Handler for updating goal */
  onUpdateGoal: GoalUpdateHandler;
  /** Additional class names */
  className?: string;
}

/**
 * Quarterly goal list item variant.
 * Displays a quarterly goal with star/pin controls, popover trigger, and action buttons.
 * Does NOT include a checkbox (quarterly goals use star/pin instead).
 *
 * Must be wrapped with GoalProvider.
 *
 * @example
 * ```tsx
 * <GoalProvider goal={quarterlyGoal}>
 *   <QuarterlyGoalItem
 *     onToggleStatus={handleToggleStatus}
 *     onUpdateGoal={handleUpdate}
 *   />
 * </GoalProvider>
 * ```
 */
export function QuarterlyGoalItem({
  onToggleStatus,
  onUpdateGoal,
  className,
}: QuarterlyGoalItemProps) {
  return (
    <GoalListItemProvider>
      <QuarterlyGoalItemContentInternal
        onToggleStatus={onToggleStatus}
        onUpdateGoal={onUpdateGoal}
        className={className}
      />
    </GoalListItemProvider>
  );
}

interface QuarterlyGoalItemContentInternalProps extends QuarterlyGoalItemProps {}

function QuarterlyGoalItemContentInternal({
  onToggleStatus,
  onUpdateGoal,
  className,
}: QuarterlyGoalItemContentInternalProps) {
  const { goal } = useGoalContext();
  const { setPendingUpdate } = useGoalListItemContext();
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
    async (title: string, details?: string, dueDate?: number, _domainId?: Id<'domains'> | null) => {
      const updatePromise = onUpdateGoal(goal._id, title, details, dueDate);
      setPendingUpdate(updatePromise);
      return updatePromise;
    },
    [goal._id, onUpdateGoal, setPendingUpdate]
  );

  return (
    <div
      className={cn(
        'group px-2 py-1 rounded-sm',
        isComplete
          ? 'bg-green-50 dark:bg-green-950/20'
          : isAllWeeklyGoalsComplete
            ? 'bg-green-50/50 dark:bg-green-950/10'
            : 'hover:bg-accent/50',
        className
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

        {/* QuarterlyGoalPopover gets goal from context */}
        <QuarterlyGoalPopover
          onSave={handleSaveGoal}
          triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
          titleClassName={cn(
            'text-gray-600 dark:text-gray-300 flex items-center',
            getDueDateStyle(goal.dueDate ? new Date(goal.dueDate) : null, goal.isComplete)
          )}
          onToggleComplete={handleToggleCompletion}
        />

        <GoalPendingIndicator>
          <GoalActionButtons
            onSave={handleSaveGoal}
            onUpdatePending={setPendingUpdate}
            showDeleteButton
            deleteRequiresConfirmation={true}
          />
        </GoalPendingIndicator>
      </div>
    </div>
  );
}
