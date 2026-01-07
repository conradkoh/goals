import type { ReactNode } from 'react';

import { useGoalListItemContextOptional } from './GoalListItemContext';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export interface GoalPendingIndicatorProps {
  /** Whether in optimistic state (from goal.isOptimistic) */
  isOptimistic?: boolean;
  /** Content to show when not pending */
  children: ReactNode;
  /** Spinner size class name */
  spinnerClassName?: string;
  /** Container class name */
  className?: string;
}

/**
 * Conditionally renders children or a spinner based on pending state.
 * Shows spinner when:
 * - The goal is in optimistic state (isOptimistic prop)
 * - An update is pending (from GoalListItemContext)
 *
 * @example
 * ```tsx
 * <GoalPendingIndicator isOptimistic={goal.isOptimistic}>
 *   <FireIcon />
 *   <PendingIcon />
 *   <EditButton />
 * </GoalPendingIndicator>
 * ```
 */
export function GoalPendingIndicator({
  isOptimistic = false,
  children,
  spinnerClassName = 'h-3.5 w-3.5',
  className,
}: GoalPendingIndicatorProps) {
  // Use optional context - component can work without provider
  const listItemContext = useGoalListItemContextOptional();
  const isPending = listItemContext?.isPending ?? false;

  const showSpinner = isOptimistic || isPending;

  if (showSpinner) {
    return (
      <div className={cn('flex items-center', className)}>
        <Spinner className={spinnerClassName} />
      </div>
    );
  }

  return <>{children}</>;
}
