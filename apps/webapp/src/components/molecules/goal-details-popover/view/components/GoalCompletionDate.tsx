import { DateTime } from 'luxon';

export interface GoalCompletionDateProps {
  /** Completion timestamp in milliseconds */
  completedAt: number;
  /** Size variant */
  size?: 'sm' | 'default';
}

/**
 * Displays when a goal was completed.
 *
 * @example
 * ```tsx
 * <GoalCompletionDate completedAt={1701388800000} />
 * ```
 */
export function GoalCompletionDate({ completedAt, size = 'sm' }: GoalCompletionDateProps) {
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={`${textClass} text-muted-foreground`}>
      Completed on {DateTime.fromMillis(completedAt).toFormat('LLL d, yyyy')}
    </div>
  );
}
