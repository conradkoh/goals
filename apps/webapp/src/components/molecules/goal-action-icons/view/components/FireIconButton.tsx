import type { Id } from '@workspace/backend/convex/_generated/dataModel';

import { FireIcon } from '@/components/atoms/FireIcon';

export interface FireIconButtonProps {
  /** Goal ID for fire status tracking */
  goalId: Id<'goals'>;
  /** Additional class names to apply to the button */
  className?: string;
  /** Group name for hover interactions (defaults to 'title') */
  groupName?: string;
}

/**
 * Fire (urgent) icon button component.
 * Renders the FireIcon with consistent styling for marking goals as urgent.
 *
 * @example
 * ```tsx
 * <FireIconButton goalId={goal._id} />
 * ```
 */
export function FireIconButton({ goalId, className, groupName = 'title' }: FireIconButtonProps) {
  return <FireIcon goalId={goalId} className={className} groupName={groupName} />;
}
