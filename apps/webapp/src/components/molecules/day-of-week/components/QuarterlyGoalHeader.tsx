import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { Check, Pin, Star } from 'lucide-react';
import { useCallback } from 'react';
import { QuarterlyGoalPopover } from '@/components/molecules/goal-details-popover';
import { GoalProvider } from '@/contexts/GoalContext';
import { useWeek } from '@/hooks/useWeek';

export interface QuarterlyGoalHeaderProps {
  goal: GoalWithDetailsAndChildren;
  onUpdateGoal: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
}

export const QuarterlyGoalHeader = ({ goal, onUpdateGoal }: QuarterlyGoalHeaderProps) => {
  const { toggleGoalCompletion, weekNumber } = useWeek();
  const isStarred = goal.state?.isStarred ?? false;
  const isPinned = goal.state?.isPinned ?? false;
  const isComplete = goal.isComplete;

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
    async (title: string, details?: string, dueDate?: number) => {
      await onUpdateGoal(goal._id, title, details, dueDate);
    },
    [goal._id, onUpdateGoal]
  );

  return (
    <GoalProvider goal={goal}>
      <div className="flex items-center gap-1.5 mb-2">
        {isStarred && (
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
        )}
        {isPinned && <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400 flex-shrink-0" />}
        {isComplete && <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
        {/* QuarterlyGoalPopover gets goal from context */}
        <QuarterlyGoalPopover
          onSave={handleSaveGoal}
          triggerClassName="p-0 h-auto hover:bg-transparent font-semibold justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
          titleClassName=""
          onToggleComplete={handleToggleCompletion}
        />
      </div>
    </GoalProvider>
  );
};
