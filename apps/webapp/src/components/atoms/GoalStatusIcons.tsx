import type { Id } from '@workspace/backend/convex/_generated/dataModel';

import { FireIcon } from '@/components/atoms/FireIcon';

export interface GoalStatusIconsProps {
  /** Goal ID for status tracking */
  goalId: Id<'goals'>;
  /** Additional class names */
  className?: string;
}

/**
 * Displays Fire (urgent) icon for a goal.
 * Used in goal detail popovers/modals for quick access to mark urgent.
 *
 * Other actions (Mark Pending, Delete, Move to Backlog) are now in the GoalActionMenuNew.
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
        {/* Fire icon for quick urgent toggle - larger for better touch targets */}
        <FireIcon
          goalId={goalId}
          className="opacity-100 [&_svg]:h-5 [&_svg]:w-5 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
        />
      </div>
    </div>
  );
}
