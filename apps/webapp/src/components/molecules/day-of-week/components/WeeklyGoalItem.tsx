import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithOptimisticStatus } from '@/hooks/useWeek';
import { useGoalActions } from '@/hooks/useGoalActions';
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
import { DeleteGoalIconButton } from '@/components/atoms/DeleteGoalIconButton';
import { Spinner } from '@/components/ui/spinner';
import { Edit2 } from 'lucide-react';
import { FireIcon } from '@/components/atoms/FireIcon';

export interface WeeklyGoalItemProps {
  goal: GoalWithOptimisticStatus;
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
  isOnFire?: boolean;
  toggleFireStatus?: (goalId: Id<'goals'>) => void;
}

export const WeeklyGoalItem = ({
  goal,
  onUpdateTitle,
  onDelete,
  isOnFire = false,
  toggleFireStatus,
}: WeeklyGoalItemProps) => {
  const { toggleGoalCompletion } = useGoalActions();
  const { weekNumber: currentWeekNumber } = useWeek();
  const isComplete = goal.state?.isComplete ?? false;

  const handleToggleCompletion = async (newState: boolean) => {
    await toggleGoalCompletion({
      goalId: goal._id,
      weekNumber: currentWeekNumber,
      isComplete: newState,
      updateChildren: false,
    });
  };

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

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
              >
                <span className="break-words w-full whitespace-pre-wrap">
                  {goal.title}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold break-words flex-1 mr-2">
                    {goal.title}
                  </h3>
                  {!goal.isOptimistic && (
                    <GoalEditPopover
                      title={goal.title}
                      details={goal.details}
                      onSave={async (title, details) => {
                        await onUpdateTitle(goal._id, title, details);
                      }}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  )}
                </div>
                {goal.details && (
                  <SafeHTML html={goal.details} className="mt-2 text-sm" />
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1">
            {goal.isOptimistic ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                {toggleFireStatus && (
                  <FireIcon
                    goalId={goal._id}
                    isOnFire={isOnFire}
                    toggleFireStatus={toggleFireStatus}
                  />
                )}
                <GoalEditPopover
                  title={goal.title}
                  details={goal.details}
                  onSave={async (title, details) => {
                    await onUpdateTitle(goal._id, title, details);
                  }}
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
