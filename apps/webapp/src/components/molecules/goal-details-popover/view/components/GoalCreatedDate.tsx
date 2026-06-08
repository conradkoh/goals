import { DateTime } from 'luxon';

export interface GoalCreatedDateProps {
  /** Creation timestamp in milliseconds (Convex `_creationTime`) */
  createdAt?: number;
  /** Size variant */
  size?: 'sm' | 'default';
}

/**
 * Displays when a goal was created.
 * Renders nothing if no valid timestamp is provided.
 *
 * @example
 * ```tsx
 * <GoalCreatedDate createdAt={goal._creationTime} />
 * ```
 */
export function GoalCreatedDate({ createdAt, size = 'sm' }: GoalCreatedDateProps) {
  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) {
    return null;
  }

  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={`${textClass} text-muted-foreground`}>
      Created on {DateTime.fromMillis(createdAt).toFormat('LLL d, yyyy')}
    </div>
  );
}
