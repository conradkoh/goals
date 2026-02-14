'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import type { ReactNode } from 'react';

import type { WeeklyGoalDragData } from './types';

import { DragHandle } from '@/components/atoms/DragHandle';
import { cn } from '@/lib/utils';

export interface DraggableWeeklyGoalProps {
  /** The weekly goal to make draggable */
  goal: GoalWithDetailsAndChildren;
  /** The source week information */
  sourceWeek: {
    year: number;
    quarter: number;
    weekNumber: number;
  };
  /** The parent quarterly goal ID */
  parentId: Id<'goals'>;
  /** Children to render inside the draggable wrapper */
  children: ReactNode;
  /** Additional className for the wrapper */
  className?: string;
  /** Whether dragging is disabled */
  disabled?: boolean;
}

/**
 * Wrapper component that makes a weekly goal card draggable.
 * Automatically adds a drag handle (hidden on touch devices).
 */
export function DraggableWeeklyGoal({
  goal,
  sourceWeek,
  parentId,
  children,
  className,
  disabled = false,
}: DraggableWeeklyGoalProps) {
  const dragData: WeeklyGoalDragData = {
    type: 'weekly-goal',
    goalId: goal._id,
    goalTitle: goal.title,
    sourceWeek,
    parentId,
  };

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `draggable-weekly-goal-${goal._id}`,
    data: dragData,
    disabled,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group flex items-center gap-1', isDragging && 'opacity-50 z-50', className)}
    >
      <DragHandle
        attributes={attributes}
        listeners={listeners}
        disabled={disabled}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

DraggableWeeklyGoal.displayName = 'DraggableWeeklyGoal';
