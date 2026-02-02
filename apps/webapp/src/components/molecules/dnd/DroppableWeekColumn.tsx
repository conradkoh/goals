'use client';

import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';

import { isWeeklyGoalDrag, type WeekColumnDropData } from './types';

import { cn } from '@/lib/utils';

export interface DroppableWeekColumnProps {
  /** The week information */
  year: number;
  quarter: number;
  weekNumber: number;
  /** Children to render inside the droppable area */
  children: ReactNode;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * Wrapper component that makes a week column a valid drop zone.
 * Shows visual feedback when a draggable item is over it.
 */
export function DroppableWeekColumn({
  year,
  quarter,
  weekNumber,
  children,
  className,
}: DroppableWeekColumnProps) {
  const dropData: WeekColumnDropData = {
    type: 'week-column',
    year,
    quarter,
    weekNumber,
  };

  const { setNodeRef, isOver, active } = useDroppable({
    id: `droppable-week-${year}-${quarter}-${weekNumber}`,
    data: dropData,
  });

  // Only show highlight if dragging a weekly goal
  const isDraggingWeeklyGoal = active?.data?.current && isWeeklyGoalDrag(active.data.current);
  const showDropHighlight = isOver && isDraggingWeeklyGoal;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors duration-200',
        showDropHighlight && 'ring-2 ring-primary ring-offset-2 bg-primary/5',
        className
      )}
    >
      {children}
    </div>
  );
}

DroppableWeekColumn.displayName = 'DroppableWeekColumn';
