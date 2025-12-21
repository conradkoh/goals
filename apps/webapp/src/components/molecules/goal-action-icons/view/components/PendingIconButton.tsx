import type { Id } from '@workspace/backend/convex/_generated/dataModel';

import { PendingIcon } from '@/components/atoms/PendingIcon';

export interface PendingIconButtonProps {
  /** Goal ID for pending status tracking */
  goalId: Id<'goals'>;
  /** Additional class names to apply to the button */
  className?: string;
  /** Group name for hover interactions (defaults to 'title') */
  groupName?: string;
}

/**
 * Pending status icon button component.
 * Renders the PendingIcon with consistent styling for marking goals as pending.
 *
 * @example
 * ```tsx
 * <PendingIconButton goalId={goal._id} />
 * ```
 */
export function PendingIconButton({
  goalId,
  className,
  groupName = 'title',
}: PendingIconButtonProps) {
  return <PendingIcon goalId={goalId} className={className} groupName={groupName} />;
}
