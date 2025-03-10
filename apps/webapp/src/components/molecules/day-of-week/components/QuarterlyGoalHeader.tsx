import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { GoalDetailsPopover } from '@/components/molecules/goal-details';
import { Star, Pin, Check } from 'lucide-react';
import { useWeek } from '@/hooks/useWeek';
import { useCallback } from 'react';

export interface QuarterlyGoalHeaderProps {
  goal: GoalWithDetailsAndChildren;
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
}

export const QuarterlyGoalHeader = ({
  goal,
  onUpdateTitle,
}: QuarterlyGoalHeaderProps) => {
  const { toggleGoalCompletion, weekNumber } = useWeek();
  const isStarred = goal.state?.isStarred ?? false;
  const isPinned = goal.state?.isPinned ?? false;
  const isComplete = goal.state?.isComplete ?? false;

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
    <div className="flex items-center gap-1.5 mb-2">
      {isStarred && (
        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
      )}
      {isPinned && (
        <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400 flex-shrink-0" />
      )}
      {isComplete && (
        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
      )}
      <GoalDetailsPopover
        title={goal.title}
        details={goal.details}
        onSave={handleSaveTitle}
        triggerClassName="p-0 h-auto hover:bg-transparent font-semibold justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
        titleClassName=""
        additionalContent={
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox
              id={`complete-header-${goal._id}`}
              checked={isComplete}
              onCheckedChange={(checked) =>
                handleToggleCompletion(checked === true)
              }
            />
            <label
              htmlFor={`complete-header-${goal._id}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Mark as complete
            </label>
          </div>
        }
      />
    </div>
  );
};
