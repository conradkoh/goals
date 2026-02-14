import type { Id } from '@workspace/backend/convex/_generated/dataModel';

/**
 * Data attached to a draggable weekly goal.
 */
export interface WeeklyGoalDragData {
  type: 'weekly-goal';
  goalId: Id<'goals'>;
  goalTitle: string;
  sourceWeek: {
    year: number;
    quarter: number;
    weekNumber: number;
  };
  parentId: Id<'goals'>;
}

/**
 * Data for a week column drop zone.
 */
export interface WeekColumnDropData {
  type: 'week-column';
  year: number;
  quarter: number;
  weekNumber: number;
}

/**
 * Data for a quarterly goal drop zone (for reparenting).
 */
export interface QuarterlyGoalDropData {
  type: 'quarterly-goal';
  quarterlyGoalId: Id<'goals'>;
  quarterlyGoalTitle: string;
}

/**
 * Union type for all drop zone data.
 */
export type DropData = WeekColumnDropData | QuarterlyGoalDropData;

/**
 * Type guard to check if data is a week column drop.
 */
export function isWeekColumnDrop(data: unknown): data is WeekColumnDropData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    (data as WeekColumnDropData).type === 'week-column'
  );
}

/**
 * Type guard to check if data is a quarterly goal drop.
 */
export function isQuarterlyGoalDrop(data: unknown): data is QuarterlyGoalDropData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    (data as QuarterlyGoalDropData).type === 'quarterly-goal'
  );
}

/**
 * Type guard to check if drag data is for a weekly goal.
 */
export function isWeeklyGoalDrag(data: unknown): data is WeeklyGoalDragData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    (data as WeeklyGoalDragData).type === 'weekly-goal'
  );
}
