import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithOptimisticStatus } from '@/hooks/useWeek';
import { useWeek } from '@/hooks/useWeek';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { SafeHTML } from '@/components/ui/safe-html';
import { DeleteGoalIconButton } from '@/components/organisms/DeleteGoalIconButton';
import { Spinner } from '@/components/ui/spinner';
import { Edit2 } from 'lucide-react';
import { FireIcon } from '@/components/atoms/FireIcon';
import { useCallback } from 'react';
import { GoalDetailsPopover } from '@/components/molecules/goal-details';
import { useFireGoalStatus } from '@/contexts/FireGoalsContext';

export interface WeeklyGoalTaskItemProps {
  goal: GoalWithOptimisticStatus;
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
}

export const WeeklyGoalTaskItem = ({
  goal,
  onUpdateTitle,
}: WeeklyGoalTaskItemProps) => {
  const { toggleGoalCompletion } = useWeek();
  const { weekNumber: currentWeekNumber } = useWeek();
  const isComplete = goal.isComplete;

  // Use the custom hook for fire goal status
  const { isOnFire, toggleFireStatus } = useFireGoalStatus(goal._id);

  const handleToggleCompletion = useCallback(
    async (newState: boolean) => {
      await toggleGoalCompletion({
        goalId: goal._id,
        weekNumber: currentWeekNumber,
        isComplete: newState,
        updateChildren: false,
      });

      // If the goal is marked as complete and it's on fire, remove it from the onFire section
      if (newState && isOnFire) {
        toggleFireStatus(goal._id);
      }
    },
    [
      toggleGoalCompletion,
      goal._id,
      currentWeekNumber,
      isOnFire,
      toggleFireStatus,
    ]
  );

  const handleUpdateTitle = useCallback(
    async (title: string, details?: string) => {
      await onUpdateTitle(goal._id, title, details);
    },
    [onUpdateTitle, goal._id]
  );

  return (
    <div className="weekly-goal-item ml-1 group rounded-sm hover:bg-gray-50/50">
      <div>
        <div className="text-sm flex items-center gap-2 group/title">
          <Checkbox
            checked={isComplete}
            onCheckedChange={(checked) =>
              handleToggleCompletion(checked === true)
            }
            className="flex-shrink-0"
          />

          <GoalDetailsPopover
            goal={goal}
            onSave={handleUpdateTitle}
            triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
            onToggleComplete={handleToggleCompletion}
          />

          <div className="flex items-center gap-1">
            {goal.isOptimistic ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                <FireIcon goalId={goal._id} />
                <GoalEditPopover
                  title={goal.title}
                  details={goal.details}
                  onSave={handleUpdateTitle}
                  trigger={
                    <button className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-foreground">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                <DeleteGoalIconButton
                  requireConfirmation={false}
                  goalId={goal._id}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
