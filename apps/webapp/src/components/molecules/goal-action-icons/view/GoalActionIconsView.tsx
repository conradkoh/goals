import type { ReactNode } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export interface GoalActionIconsViewProps {
  /** Container class name */
  className?: string;
  /** Whether to show a loading spinner instead of icons */
  showSpinner?: boolean;
  /** Children to render (typically icon buttons) */
  children?: ReactNode;
}

/**
 * Base container component for goal action icons.
 * Provides consistent flex layout with gap-1 spacing and flex-shrink-0.
 *
 * This is the composable view that can be used to build custom icon button layouts.
 *
 * @example
 * ```tsx
 * <GoalActionIconsView>
 *   <FireIconButton goalId={goal._id} />
 *   <PendingIconButton goalId={goal._id} />
 *   <EditIconButton {...editProps} />
 *   <DeleteIconButton onDelete={handleDelete} />
 * </GoalActionIconsView>
 * ```
 *
 * @example With loading state
 * ```tsx
 * <GoalActionIconsView showSpinner={isLoading}>
 *   {!isLoading && (
 *     <>
 *       <FireIconButton goalId={goal._id} />
 *       <PendingIconButton goalId={goal._id} />
 *     </>
 *   )}
 * </GoalActionIconsView>
 * ```
 */
export function GoalActionIconsView({
  className,
  showSpinner = false,
  children,
}: GoalActionIconsViewProps) {
  return (
    <div className={cn('flex items-center gap-1 flex-shrink-0', className)}>
      {showSpinner ? <Spinner className="h-3.5 w-3.5" /> : children}
    </div>
  );
}
