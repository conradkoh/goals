'use client';

import { useDroppable } from '@dnd-kit/core';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { ReactNode } from 'react';

import { isWeeklyGoalDrag, type QuarterlyGoalDropData } from './types';

import { cn } from '@/lib/utils';

export interface DroppableQuarterlyGoalProps {
  /** The quarterly goal ID */
  quarterlyGoalId: Id<'goals'>;
  /** The quarterly goal title (for display in toast) */
  quarterlyGoalTitle: string;
  /** Children to render inside the droppable area */
  children: ReactNode;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * Wrapper component that makes a quarterly goal section a valid drop zone for reparenting.
 * Shows visual feedback when a weekly goal is being dragged over it.
 */
export function DroppableQuarterlyGoal({
  quarterlyGoalId,
  quarterlyGoalTitle,
  children,
  className,
}: DroppableQuarterlyGoalProps) {
  const dropData: QuarterlyGoalDropData = {
    type: 'quarterly-goal',
    quarterlyGoalId,
    quarterlyGoalTitle,
  };

  const { setNodeRef, isOver, active } = useDroppable({
    id: `droppable-quarterly-goal-${quarterlyGoalId}`,
    data: dropData,
  });

  // Only show highlight if dragging a weekly goal
  const isDraggingWeeklyGoal = active?.data?.current && isWeeklyGoalDrag(active.data.current);

  // Check if the weekly goal is from a different parent
  const isFromDifferentParent =
    isDraggingWeeklyGoal &&
    active?.data?.current &&
    isWeeklyGoalDrag(active.data.current) &&
    active.data.current.parentId !== quarterlyGoalId;

  const showDropHighlight = isOver && isDraggingWeeklyGoal && isFromDifferentParent;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-all duration-200 rounded-md',
        showDropHighlight && 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50/50 dark:bg-blue-950/30',
        className
      )}
    >
      {children}
    </div>
  );
}

DroppableQuarterlyGoal.displayName = 'DroppableQuarterlyGoal';
