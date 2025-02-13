import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GoalStarPin } from './GoalStarPin';
import { EditableGoalTitle } from './EditableGoalTitle';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { DragData } from '../QuarterlyOverviewScreen2';

interface DraggableGoalProps {
  goal: GoalWithDetailsAndChildren;
  state: GoalWithDetailsAndChildren['state'];
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
  state: goalState,
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

  const dragData = {
    goal,
    state: goalState,
    sourceWeekNumber: weekNumber,
    shiftKey,
  } satisfies DragData;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${goal._id}-week-${weekNumber}`,
      data: dragData,
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
            isStarred: goalState?.isStarred ?? false,
            isPinned: goalState?.isPinned ?? false,
          }}
          onStarred={() =>
            onToggleStatus(goal._id, !goalState?.isStarred, false)
          }
          onPinned={() => onToggleStatus(goal._id, false, !goalState?.isPinned)}
        />
        <EditableGoalTitle
          title={goal.title}
          onSubmit={(newTitle) => onUpdateTitle(goal._id, newTitle)}
          onDelete={() => onDelete(goal._id)}
        />
      </div>
      {goalState?.progress && Number(goalState.progress) > 0 && (
        <span className="text-xs text-muted-foreground ml-2 tabular-nums">
          {goalState.progress}%
        </span>
      )}
    </div>
  );
};
