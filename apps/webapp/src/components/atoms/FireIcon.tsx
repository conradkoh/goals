import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { Flame } from 'lucide-react';
import type React from 'react';
import { useCallback } from 'react';

import { useFireGoalStatus } from '@/contexts/GoalStatusContext';
import { cn } from '@/lib/utils';

/**
 * Props for the fire icon component.
 */
export interface FireIconProps {
  goalId: Id<'goals'>;
  className?: string;
  /** Group name for hover interactions (defaults to 'title') */
  groupName?: string;
}

/**
 * Displays a clickable fire icon that toggles the urgent status of a goal.
 */
export const FireIcon: React.FC<FireIconProps> = ({ goalId, className, groupName = 'title' }) => {
  const { isOnFire, toggleFireStatus } = useFireGoalStatus(goalId);

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

  return (
    <button
      type="button"
      onClick={_handleClick}
      className={cn(
        `text-muted-foreground opacity-0 group-hover/${groupName}:opacity-100 pointer-events-none group-hover/${groupName}:pointer-events-auto transition-opacity`,
        isOnFire ? 'text-red-500 opacity-100 pointer-events-auto' : 'hover:text-red-500',
        className
      )}
      title={isOnFire ? 'Remove from urgent' : 'Mark as urgent'}
    >
      <Flame className="h-3.5 w-3.5" />
    </button>
  );
};
