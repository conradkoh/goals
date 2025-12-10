import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { FireIcon } from '@/components/atoms/FireIcon';
import { PendingIcon } from '@/components/atoms/PendingIcon';
import { DeleteGoalIconButton } from '@/components/organisms/DeleteGoalIconButton';

export interface GoalStatusIconsProps {
  /** Goal ID for status tracking */
  goalId: Id<'goals'>;
  /** Additional class names */
  className?: string;
  /** Whether to show the delete button */
  showDelete?: boolean;
}

/**
 * Displays Fire (urgent), Pending status, and Delete icons for a goal.
 * Used in goal detail popovers/modals to show and toggle status.
 *
 * Icons are always visible in this context (not hover-based like in list view).
 * Icons are sized larger for better touch accessibility.
 *
 * @example
 * ```tsx
 * <GoalStatusIcons goalId={goal._id} showDelete />
 * ```
 */
export function GoalStatusIcons({ goalId, className, showDelete = true }: GoalStatusIconsProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        {/* Make icons larger and add padding for better touch targets */}
        <FireIcon
          goalId={goalId}
          className="opacity-100 [&_svg]:h-5 [&_svg]:w-5 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
        />
        <PendingIcon
          goalId={goalId}
          className="opacity-100 [&_svg]:h-5 [&_svg]:w-5 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
        />
        {showDelete && (
          // Override the opacity-0 group-hover styling from DeleteGoalIconButton
          // In popover context, we want the delete button always visible
          // Make icon larger and add padding for better touch targets
          <div className="[&_button]:opacity-100 [&_button]:hover:opacity-100 [&_button]:p-1 [&_button]:min-w-[32px] [&_button]:min-h-[32px] [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_svg]:h-5 [&_svg]:w-5">
            <DeleteGoalIconButton goalId={goalId} requireConfirmation />
          </div>
        )}
      </div>
    </div>
  );
}
