import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { GoalListItemProvider } from './components/GoalListItemContext';

export interface GoalListItemViewProps {
  /** Child components to render inside the list item */
  children: ReactNode;
  /** Additional class names for the container */
  className?: string;
  /** Whether to use the pending state provider */
  enablePendingState?: boolean;
  /** Variant-specific background classes */
  backgroundClassName?: string;
}

/**
 * Base container component for goal list items.
 * Provides the layout shell and optionally wraps children with GoalListItemProvider.
 *
 * ## Usage
 *
 * ### Basic usage with pending state
 * ```tsx
 * <GoalListItemView enablePendingState>
 *   <GoalCheckbox onToggleComplete={handleToggle} />
 *   <GoalTitleTrigger />
 *   <GoalPendingIndicator isOptimistic={goal.isOptimistic}>
 *     <GoalStatusIcons goalId={goal._id} />
 *     <GoalActionButtons onSave={handleSave} />
 *   </GoalPendingIndicator>
 * </GoalListItemView>
 * ```
 *
 * ### Without pending state (simpler use case)
 * ```tsx
 * <GoalListItemView>
 *   <GoalCheckbox />
 *   <span>{goal.title}</span>
 * </GoalListItemView>
 * ```
 */
export function GoalListItemView({
  children,
  className,
  enablePendingState = true,
  backgroundClassName,
}: GoalListItemViewProps) {
  const content = (
    <div
      className={cn(
        'group rounded-sm hover:bg-accent/50 transition-colors',
        backgroundClassName,
        className
      )}
    >
      <div className="flex items-center gap-2 group/title">{children}</div>
    </div>
  );

  if (enablePendingState) {
    return <GoalListItemProvider>{content}</GoalListItemProvider>;
  }

  return content;
}

export interface GoalListItemRowProps {
  /** Child components to render in the row */
  children: ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Flex row container for goal list item content.
 * Use for organizing checkbox, title, and action areas.
 */
export function GoalListItemRow({ children, className }: GoalListItemRowProps) {
  return (
    <div className={cn('text-sm flex items-center gap-2 group/title', className)}>{children}</div>
  );
}

export interface GoalListItemActionsProps {
  /** Child components (typically buttons/icons) */
  children: ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Container for goal action buttons/icons.
 * Applies consistent spacing and alignment.
 */
export function GoalListItemActions({ children, className }: GoalListItemActionsProps) {
  return <div className={cn('flex items-center gap-1', className)}>{children}</div>;
}
