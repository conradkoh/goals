import type { Id } from '@services/backend/convex/_generated/dataModel';
import { Clock } from 'lucide-react';
import type React from 'react';
import { PendingStatusDialog } from '@/components/molecules/goal-details/PendingStatusDialog';
import { usePendingGoalStatus } from '@/contexts/GoalStatusContext';
import { cn } from '@/lib/utils';

/**
 * Props for the pending icon component.
 */
export interface PendingIconProps {
  goalId: Id<'goals'>;
  className?: string;
}

/**
 * Displays a clickable pending icon that opens a dialog to manage the pending status of a goal.
 */
export const PendingIcon: React.FC<PendingIconProps> = ({ goalId, className }) => {
  const { isPending } = usePendingGoalStatus(goalId);

  return (
    <PendingStatusDialog goalId={goalId}>
      <button
        type="button"
        className={cn(
          'text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity',
          isPending ? 'text-yellow-500 opacity-100' : 'hover:text-yellow-500',
          className
        )}
        title={isPending ? 'Update pending status' : 'Mark as pending'}
      >
        <Clock className="h-3.5 w-3.5" />
      </button>
    </PendingStatusDialog>
  );
};
