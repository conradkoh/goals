import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Edit2 } from 'lucide-react';
import { FireIcon } from '@/components/atoms/FireIcon';
import { PendingIcon } from '@/components/atoms/PendingIcon';
import { GoalDetailsPopover } from '@/components/molecules/goal-details';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useGoalActionsContext } from '@/contexts/GoalActionsContext';
import { useFireGoalStatus, usePendingGoalStatus } from '@/contexts/GoalStatusContext';
import { useDailyGoal } from '@/hooks/useDailyGoal';
import { isOptimisticId } from '@/hooks/useOptimistic';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, type DayOfWeekType, getDayName } from '@/lib/constants';
import { GoalEditPopover } from '../atoms/GoalEditPopover';
import { DeleteGoalIconButton } from './DeleteGoalIconButton';

interface DailyGoalItemProps {
  goal: GoalWithDetailsAndChildren;
  inSidebar?: boolean;
  className?: string;
}

export const DailyGoalTaskItem = ({
  goal,
  inSidebar: _inSidebar = false,
  className: _className,
}: DailyGoalItemProps) => {
  const { onUpdateGoal } = useGoalActionsContext();
  const { toggleGoalCompletion, updateDailyGoalDay, weekNumber } = useWeek();
  const { isComplete = goal.isComplete } = goal;
  const isOptimistic = isOptimisticId(goal._id);
  const currentDayOfWeek = goal.state?.daily?.dayOfWeek as DayOfWeekType | undefined;

  // Use the custom hook for fire goal status
  const { isOnFire, toggleFireStatus } = useFireGoalStatus(goal._id);

  // Use the custom hook for pending goal status
  const { isPending: _isPending } = usePendingGoalStatus(goal._id);

  // Get real-time updates from direct subscription
  const liveGoalDetails = useDailyGoal(goal._id, {
    weekNumber,
    dayOfWeek: currentDayOfWeek ?? DayOfWeek.MONDAY,
  });

  // Use the most up-to-date data, falling back to context data if subscription isn't ready
  const { title = goal.title, details = goal.details } = liveGoalDetails ?? {};

  const handleMoveToDayOfWeek = async (newDayOfWeek: DayOfWeekType) => {
    if (!currentDayOfWeek || newDayOfWeek === currentDayOfWeek) return;
    await updateDailyGoalDay({
      goalId: goal._id,
      weekNumber,
      newDayOfWeek,
    });
  };

  return (
    <div className="daily-goal-item group hover:bg-gray-50/50 rounded-sm">
      <div className="text-sm flex items-center gap-2 group/title">
        <Checkbox
          checked={isComplete}
          onCheckedChange={(checked) => {
            toggleGoalCompletion({
              goalId: goal._id,
              weekNumber,
              isComplete: checked === true,
            });

            // If the goal is marked as complete and it's on fire, remove it from the onFire section
            if (checked === true && isOnFire) {
              toggleFireStatus(goal._id);
            }
          }}
          className="flex-shrink-0"
        />

        {/* View Mode */}
        <GoalDetailsPopover
          goal={goal}
          onSave={async (newTitle: string, newDetails?: string) => {
            await onUpdateGoal(goal._id, newTitle, newDetails);
          }}
          triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
          onToggleComplete={async (checked) => {
            await toggleGoalCompletion({
              goalId: goal._id,
              weekNumber,
              isComplete: checked,
            });

            // If the goal is marked as complete and it's on fire, remove it from the onFire section
            if (checked && isOnFire) {
              toggleFireStatus(goal._id);
            }
          }}
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

        <div className="flex items-center gap-1">
          {isOptimistic ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <>
              <FireIcon goalId={goal._id} className="" />
              <PendingIcon goalId={goal._id} className="" />
              <GoalEditPopover
                title={title}
                details={details}
                onSave={async (newTitle: string, newDetails?: string) => {
                  await onUpdateGoal(goal._id, newTitle, newDetails);
                }}
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
  );
};
