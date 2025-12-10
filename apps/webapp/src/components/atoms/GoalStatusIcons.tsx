import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { FireIcon } from '@/components/atoms/FireIcon';
import { PendingIcon } from '@/components/atoms/PendingIcon';

export interface GoalStatusIconsProps {
  /** Goal ID for status tracking */
  goalId: Id<'goals'>;
  /** Additional class names */
  className?: string;
}

/**
 * Displays Fire (urgent) and Pending status icons for a goal.
 * Used in goal detail popovers/modals to show and toggle status.
 *
 * Icons are always visible in this context (not hover-based like in list view).
 *
 * @example
 * ```tsx
 * <GoalStatusIcons goalId={goal._id} />
 * ```
 */
export function GoalStatusIcons({ goalId, className }: GoalStatusIconsProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        <FireIcon goalId={goalId} className="opacity-100" />
        <PendingIcon goalId={goalId} className="opacity-100" />
      </div>
    </div>
  );
}
