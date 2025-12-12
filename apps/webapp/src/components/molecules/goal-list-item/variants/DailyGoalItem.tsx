import { useCallback } from 'react';
import { DailyGoalPopover } from '@/components/molecules/goal-details-popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGoalActionsContext } from '@/contexts/GoalActionsContext';
import { useGoalContext } from '@/contexts/GoalContext';
import { useFireGoalStatus } from '@/contexts/GoalStatusContext';
import { useDailyGoal } from '@/hooks/useDailyGoal';
import { isOptimisticId } from '@/hooks/useOptimistic';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, type DayOfWeekType, getDayName } from '@/lib/constants';
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

export interface DailyGoalItemProps {
  /** Additional class names */
  className?: string;
}

/**
 * Daily goal list item variant.
 * Displays a daily goal with checkbox, popover trigger (with day selector),
 * status icons, and action buttons.
 *
 * Must be wrapped with GoalProvider and GoalActionsProvider.
 *
 * @example
 * ```tsx
 * <GoalProvider goal={dailyGoal}>
 *   <DailyGoalItem />
 * </GoalProvider>
 * ```
 */
export function DailyGoalItem({ className }: DailyGoalItemProps) {
  return (
    <GoalListItemProvider>
      <_DailyGoalItemContent className={className} />
    </GoalListItemProvider>
  );
}

interface _DailyGoalItemContentProps {
  className?: string;
}

function _DailyGoalItemContent({ className }: _DailyGoalItemContentProps) {
  const { goal } = useGoalContext();
  const { onUpdateGoal } = useGoalActionsContext();
  const { setPendingUpdate } = useGoalListItemContext();

  const { toggleGoalCompletion, updateDailyGoalDay, weekNumber } = useWeek();
  const isOptimistic = isOptimisticId(goal._id);
  const currentDayOfWeek = goal.state?.daily?.dayOfWeek as DayOfWeekType | undefined;

  const { isOnFire, toggleFireStatus } = useFireGoalStatus(goal._id);

  // Get real-time updates from direct subscription
  const liveGoalDetails = useDailyGoal(goal._id, {
    weekNumber,
    dayOfWeek: currentDayOfWeek ?? DayOfWeek.MONDAY,
  });

  // Use the most up-to-date data, falling back to context data if subscription isn't ready
  // Note: title and details are extracted for potential future use but not currently rendered
  const { title: _title = goal.title, details: _details = goal.details } = liveGoalDetails ?? {};

  /**
   * Handles moving the goal to a different day of the week.
   */
  const handleMoveToDayOfWeek = useCallback(
    async (newDayOfWeek: DayOfWeekType) => {
      if (!currentDayOfWeek || newDayOfWeek === currentDayOfWeek) return;
      await updateDailyGoalDay({
        goalId: goal._id,
        weekNumber,
        newDayOfWeek,
      });
    },
    [currentDayOfWeek, goal._id, weekNumber, updateDailyGoalDay]
  );

  /**
   * Handles toggling the completion status of the goal.
   */
  const handleToggleCompletion = useCallback(
    async (newState: boolean) => {
      await toggleGoalCompletion({
        goalId: goal._id,
        weekNumber,
        isComplete: newState,
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
    async (newTitle: string, newDetails?: string, dueDate?: number) => {
      const updatePromise = onUpdateGoal(goal._id, newTitle, newDetails, dueDate);
      setPendingUpdate(updatePromise);
      return updatePromise;
    },
    [onUpdateGoal, goal._id, setPendingUpdate]
  );

  return (
    <div className={cn('daily-goal-item group hover:bg-accent/50 rounded-sm', className)}>
      <div className="text-sm flex items-center gap-2 group/title">
        <GoalCheckbox onToggleComplete={handleToggleCompletion} disabled={isOptimistic} />

        {/* DailyGoalPopover gets goal from context */}
        <DailyGoalPopover
          onSave={handleUpdateGoal}
          triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
          titleClassName={cn(
            getDueDateStyle(goal.dueDate ? new Date(goal.dueDate) : null, goal.isComplete)
          )}
          onToggleComplete={handleToggleCompletion}
          additionalContent={
            <div className="flex items-center gap-2 pt-2 border-t">
              <Select
                value={currentDayOfWeek?.toString()}
                onValueChange={(value) =>
                  handleMoveToDayOfWeek(Number.parseInt(value) as DayOfWeekType)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Move to day" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DayOfWeek).map((value) => (
                    <SelectItem
                      key={value}
                      value={value.toString()}
                      disabled={value === currentDayOfWeek}
                    >
                      {getDayName(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
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
