import { useDailyGoal } from '@/hooks/useDailyGoal';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useWeek } from '@/hooks/useWeek';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SafeHTML } from '@/components/ui/safe-html';
import { Edit2 } from 'lucide-react';
import { GoalEditPopover } from '../atoms/GoalEditPopover';
import { DeleteGoalIconButton } from './DeleteGoalIconButton';
import { DayOfWeek, DayOfWeekType, getDayName } from '@/lib/constants';
import { Spinner } from '@/components/ui/spinner';
import { isOptimisticId } from '@/hooks/useOptimistic';
import { FireIcon } from '@/components/atoms/FireIcon';
import { GoalDetailsPopover } from '@/components/molecules/goal-details';
import { useFireGoalStatus } from '@/contexts/FireGoalsContext';

interface DailyGoalItemProps {
  goal: GoalWithDetailsAndChildren;
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => void;
  inSidebar?: boolean;
  className?: string;
}

export const DailyGoalTaskItem = ({
  goal,
  onUpdateTitle,
  onDelete,
  inSidebar = false,
  className,
}: DailyGoalItemProps) => {
  const { toggleGoalCompletion, updateDailyGoalDay, weekNumber } = useWeek();
  const { isComplete = goal.isComplete, completedAt = goal.completedAt } = goal;
  const isOptimistic = isOptimisticId(goal._id);
  const currentDayOfWeek = goal.state?.daily?.dayOfWeek as
    | DayOfWeekType
    | undefined;

  // Use the custom hook for fire goal status
  const { isOnFire, toggleFireStatus } = useFireGoalStatus(goal._id);

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
            await onUpdateTitle(goal._id, newTitle, newDetails);
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
                  handleMoveToDayOfWeek(parseInt(value) as DayOfWeekType)
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
              <GoalEditPopover
                title={title}
                details={details}
                onSave={async (newTitle: string, newDetails?: string) => {
                  await onUpdateTitle(goal._id, newTitle, newDetails);
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
  );
};
