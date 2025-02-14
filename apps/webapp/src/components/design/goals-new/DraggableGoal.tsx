import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GoalStarPin } from './GoalStarPin';
import { EditableGoalTitle } from './EditableGoalTitle';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';

interface DraggableGoalProps {
  goal: GoalWithDetailsAndChildren;
  weeklyGoal: GoalWithDetailsAndChildren['weeklyGoal'];
  weekNumber: number;
  onToggleStatus: (
    goalId: Id<'goals'>,
    isStarred: boolean,
    isPinned: boolean
  ) => Promise<void>;
  onUpdateTitle: (goalId: Id<'goals'>, newTitle: string) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
}

export const DraggableGoal = ({
  goal,
  weeklyGoal,
  weekNumber,
  onToggleStatus,
  onUpdateTitle,
  onDelete,
}: DraggableGoalProps) => {
  const [shiftKey, setShiftKey] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey) setShiftKey(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey) setShiftKey(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${goal._id}-week-${weekNumber}`,
      data: {
        goal,
        weeklyGoal,
        sourceWeekNumber: weekNumber,
        shiftKey,
      },
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group px-2 py-1.5 rounded-sm hover:bg-gray-50 flex items-center justify-between cursor-move touch-none transition-shadow bg-white',
        isDragging && 'shadow-lg ring-1 ring-black/10'
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-grow">
        <GoalStarPin
          value={{
            isStarred: weeklyGoal?.isStarred ?? false,
            isPinned: weeklyGoal?.isPinned ?? false,
          }}
          onStarred={() =>
            onToggleStatus(goal._id, !weeklyGoal?.isStarred, false)
          }
          onPinned={() =>
            onToggleStatus(goal._id, false, !weeklyGoal?.isPinned)
          }
        />
        <EditableGoalTitle
          title={goal.title}
          onSubmit={(newTitle) => onUpdateTitle(goal._id, newTitle)}
          onDelete={() => onDelete(goal._id)}
        />
      </div>
      {weeklyGoal?.progress && Number(weeklyGoal.progress) > 0 && (
        <span className="text-xs text-muted-foreground ml-2 tabular-nums">
          {weeklyGoal.progress}%
        </span>
      )}
    </div>
  );
};
