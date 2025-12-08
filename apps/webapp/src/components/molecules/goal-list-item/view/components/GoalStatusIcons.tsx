import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { ReactNode } from 'react';
import { FireIcon } from '@/components/atoms/FireIcon';
import { PendingIcon } from '@/components/atoms/PendingIcon';
import { cn } from '@/lib/utils';

export interface GoalStatusIconsProps {
  /** Goal ID for status lookup */
  goalId: Id<'goals'>;
  /** Whether to show fire icon */
  showFireIcon?: boolean;
  /** Whether to show pending icon */
  showPendingIcon?: boolean;
  /** Additional class names */
  className?: string;
  /** Additional icons to render before fire/pending */
  prefixIcons?: ReactNode;
  /** Additional icons to render after fire/pending */
  suffixIcons?: ReactNode;
}

/**
 * Container for goal status icons (fire, pending).
 * Renders icons conditionally based on props.
 *
 * @example
 * ```tsx
 * <GoalStatusIcons
 *   goalId={goal._id}
 *   showFireIcon
 *   showPendingIcon
 * />
 * ```
 */
export function GoalStatusIcons({
  goalId,
  showFireIcon = true,
  showPendingIcon = true,
  className,
  prefixIcons,
  suffixIcons,
}: GoalStatusIconsProps) {
  return (
    <div
      className={cn('flex items-center gap-1 min-w-[40px] justify-end flex-shrink-0', className)}
    >
      {prefixIcons}
      {showFireIcon && <FireIcon goalId={goalId} />}
      {showPendingIcon && <PendingIcon goalId={goalId} />}
      {suffixIcons}
    </div>
  );
}
