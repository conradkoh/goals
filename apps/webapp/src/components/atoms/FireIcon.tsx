import { Id } from '@services/backend/convex/_generated/dataModel';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFireGoalStatus } from '@/contexts/FireGoalsContext';

interface FireIconProps {
  goalId: Id<'goals'>;
  className?: string;
}

export const FireIcon: React.FC<FireIconProps> = ({ goalId, className }) => {
  // Use the custom hook for fire goal status
  const { isOnFire, toggleFireStatus } = useFireGoalStatus(goalId);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleFireStatus(goalId);
      }}
      className={cn(
        'text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity',
        isOnFire ? 'text-red-500 opacity-100' : 'hover:text-red-500',
        className
      )}
      title={isOnFire ? 'Remove from urgent' : 'Mark as urgent'}
    >
      <Flame className="h-3.5 w-3.5" />
    </button>
  );
};
