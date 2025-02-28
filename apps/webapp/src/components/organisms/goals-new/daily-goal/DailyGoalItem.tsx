import { useDailyGoal } from '@/hooks/useDailyGoal';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useWeek } from '@/hooks/useWeek';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SafeHTML } from '@/components/ui/safe-html';
import { Edit2 } from 'lucide-react';
import { GoalEditPopover } from '../GoalEditPopover';
import { DeleteGoalIconButton } from '../DeleteGoalIconButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DayOfWeek, DayOfWeekType, getDayName } from '@/lib/constants';
import { useGoalActions } from '@/hooks/useGoalActions';
import { Spinner } from '@/components/ui/spinner';
import { isOptimisticId } from '@/hooks/useOptimistic';

interface DailyGoalItemProps {
  goal: GoalWithDetailsAndChildren;
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
}

export const DailyGoalItem = ({
  goal,
  onUpdateTitle,
  onDelete,
}: DailyGoalItemProps) => {
  const { toggleGoalCompletion, updateDailyGoalDay } = useGoalActions();
  const { weekNumber } = useWeek();
  const currentDayOfWeek = goal.state?.daily?.dayOfWeek as
    | DayOfWeekType
    | undefined;

  // Get real-time updates from direct subscription
  const liveGoalDetails = useDailyGoal(goal._id, {
    weekNumber,
    dayOfWeek: currentDayOfWeek ?? DayOfWeek.MONDAY,
  });

  // Use the most up-to-date data, falling back to context data if subscription isn't ready
  const {
    title = goal.title,
    details = goal.details,
    isComplete = goal.state?.isComplete ?? false,
  } = liveGoalDetails ?? {};

  const isOptimistic = isOptimisticId(goal._id);

  const handleMoveToDayOfWeek = async (newDayOfWeek: DayOfWeekType) => {
    if (!currentDayOfWeek || newDayOfWeek === currentDayOfWeek) return;
    await updateDailyGoalDay({
      goalId: goal._id,
      weekNumber,
      newDayOfWeek,
    });
  };

  return (
    <div className="group hover:bg-gray-50/50 rounded-sm">
      <div className="text-sm flex items-center gap-2 group/title">
        <Checkbox
          checked={isComplete}
          onCheckedChange={(checked) =>
            toggleGoalCompletion({
              goalId: goal._id,
              weekNumber,
              isComplete: checked === true,
            })
          }
          className="flex-shrink-0"
        />

        {/* View Mode */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
            >
              <span className="break-words w-full whitespace-pre-wrap">
                {title}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold break-words flex-1 mr-2">
                  {title}
                </h3>
                <div className="flex items-center gap-2">
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
                  <GoalEditPopover
                    title={title}
                    details={details}
                    onSave={async (newTitle: string, newDetails?: string) => {
                      await onUpdateTitle(goal._id, newTitle, newDetails);
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
                </div>
              </div>
              {details && <SafeHTML html={details} className="mt-2 text-sm" />}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-1">
          {isOptimistic ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <>
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
                onDelete={() => onDelete(goal._id)}
                requireConfirmation={false}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
