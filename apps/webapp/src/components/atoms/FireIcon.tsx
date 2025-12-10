import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { Flame } from 'lucide-react';
import type React from 'react';
import { useCallback } from 'react';
import { useFireGoalStatus } from '@/contexts/GoalStatusContext';
import { useDeviceScreenInfo } from '@/hooks/useDeviceScreenInfo';
import { cn } from '@/lib/utils';

/**
 * Props for the fire icon component.
 */
export interface FireIconProps {
  goalId: Id<'goals'>;
  className?: string;
}

/**
 * Displays a clickable fire icon that toggles the urgent status of a goal.
 */
export const FireIcon: React.FC<FireIconProps> = ({ goalId, className }) => {
  const { isOnFire, toggleFireStatus } = useFireGoalStatus(goalId);
  const { isTouchDevice } = useDeviceScreenInfo();

  /**
   * Handles click events on the fire icon to toggle goal fire status.
   */
  const _handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      toggleFireStatus(goalId);
    },
    [goalId, toggleFireStatus]
  );

  // On touch devices, always show icon (no hover state available)
  // On desktop, show on hover via group-hover/title
  const baseVisibilityClass = isTouchDevice
    ? 'opacity-70'
    : 'opacity-0 group-hover/title:opacity-100';

  return (
    <button
      type="button"
      onClick={_handleClick}
      className={cn(
        'text-muted-foreground transition-opacity',
        isOnFire ? 'text-red-500 opacity-100' : cn(baseVisibilityClass, 'hover:text-red-500'),
        className
      )}
      title={isOnFire ? 'Remove from urgent' : 'Mark as urgent'}
    >
      <Flame className="h-3.5 w-3.5" />
    </button>
  );
};
