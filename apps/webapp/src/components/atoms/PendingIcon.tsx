import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { Clock } from 'lucide-react';
import type React from 'react';
import { PendingStatusDialog } from '@/components/atoms/PendingStatusDialog';
import { usePendingGoalStatus } from '@/contexts/GoalStatusContext';
import { useDeviceScreenInfo } from '@/hooks/useDeviceScreenInfo';
import { cn } from '@/lib/utils';

/**
 * Props for the PendingIcon component.
 */
export interface PendingIconProps {
  /** Unique identifier of the goal to display pending status for */
  goalId: Id<'goals'>;
  /** Additional CSS classes to apply to the button */
  className?: string;
}

/**
 * Displays a clickable pending icon that opens a dialog to manage the pending status of a goal.
 * Shows an orange clock icon when the goal is pending, otherwise shows a muted icon on hover.
 *
 * @example
 * ```tsx
 * <PendingIcon goalId={goal._id} className="ml-2" />
 * ```
 */
export const PendingIcon: React.FC<PendingIconProps> = ({ goalId, className }) => {
  const { isPending } = usePendingGoalStatus(goalId);
  const { isTouchDevice } = useDeviceScreenInfo();

  // On touch devices, always show icon (no hover state available)
  // On desktop, show on hover via group-hover/title
  const baseVisibilityClass = isTouchDevice
    ? 'opacity-70'
    : 'opacity-0 group-hover/title:opacity-100';

  return (
    <PendingStatusDialog goalId={goalId}>
      <button
        type="button"
        className={cn(
          'text-muted-foreground transition-opacity',
          isPending
            ? 'text-orange-600 dark:text-orange-400 opacity-100'
            : cn(baseVisibilityClass, 'hover:text-orange-600 dark:hover:text-orange-400'),
          className
        )}
        title={isPending ? 'Update pending status' : 'Mark as pending'}
      >
        <Clock className="h-3.5 w-3.5" />
      </button>
    </PendingStatusDialog>
  );
};
