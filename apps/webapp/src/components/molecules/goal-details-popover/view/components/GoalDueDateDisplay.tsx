import { CalendarIcon } from 'lucide-react';
import { DateTime } from 'luxon';

import { cn } from '@/lib/utils';

export interface GoalDueDateDisplayProps {
  /** Due date timestamp in milliseconds */
  dueDate: number;
  /** Whether the goal is complete (affects styling) */
  isComplete: boolean;
  /** Size variant */
  size?: 'sm' | 'default';
}

/**
 * Displays a goal's due date with color coding based on urgency.
 *
 * Color coding:
 * - Purple: Overdue (past due date)
 * - Red: Due today
 * - Yellow: Due within 3 days
 * - Muted: Future dates or completed
 *
 * @example
 * ```tsx
 * <GoalDueDateDisplay
 *   dueDate={1701388800000}
 *   isComplete={false}
 * />
 * ```
 */
export function GoalDueDateDisplay({ dueDate, isComplete, size = 'sm' }: GoalDueDateDisplayProps) {
  const dueDateObj = DateTime.fromMillis(dueDate);
  const today = DateTime.now().startOf('day');
  const dueDateStart = dueDateObj.startOf('day');

  const isOverdue = dueDateStart < today && !isComplete;
  const isDueToday = dueDateStart.equals(today) && !isComplete;
  const isDueSoon =
    dueDateStart < today.plus({ days: 3 }) && !isComplete && !isOverdue && !isDueToday;

  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div
      className={cn(
        textClass,
        'flex items-center gap-2',
        isOverdue
          ? 'text-purple-700 dark:text-purple-500 font-medium'
          : isDueToday
            ? 'text-red-600 dark:text-red-400 font-medium'
            : isDueSoon
              ? 'text-yellow-600 dark:text-yellow-400 font-medium'
              : 'text-muted-foreground'
      )}
    >
      <CalendarIcon className={iconClass} />
      <span>
        Due: {dueDateObj.toFormat('LLL d, yyyy')}
        {isOverdue && ' (overdue)'}
      </span>
    </div>
  );
}
