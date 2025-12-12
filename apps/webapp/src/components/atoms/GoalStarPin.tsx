import { Pin, Star } from 'lucide-react';
import type React from 'react';

// Example usage:
/*
import { GoalStarPin, GoalStarPinContainer } from '@/components/atoms/GoalStarPin';

// Then in your component:
<GoalStarPinContainer>
  <GoalStarPin
    value={{ isStarred: goal.isStarred, isPinned: goal.isPinned }}
    onStarred={handleStarred}
    onPinned={handlePinned}
  />
</GoalStarPinContainer>
*/
interface GoalStarPinProps {
  value: {
    isStarred: boolean;
    isPinned: boolean;
  };
  onStarred: () => void;
  onPinned: () => void;
}

const ActionButton = ({
  icon,
  onClick,
  className = '',
}: {
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-4 flex justify-center items-center transition-all ${className}`}
  >
    {icon}
  </button>
);

/**
 * Container component that provides the necessary 'group' class for hover effects
 * Use this to wrap your GoalStarPin component
 */
export const GoalStarPinContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => <div className={`group ${className}`}>{children}</div>;

export const GoalStarPin = ({ value, onStarred, onPinned }: GoalStarPinProps) => {
  const { isStarred, isPinned } = value;

  if (isStarred) {
    return (
      <div className="flex items-center">
        <div className="w-0 group-hover:w-4 overflow-hidden transition-all duration-200">
          <ActionButton
            icon={<Pin className="h-3.5 w-3.5" />}
            onClick={onPinned}
            className="text-muted-foreground hover:text-blue-500"
          />
        </div>
        <ActionButton
          icon={<Star className="h-3.5 w-3.5 fill-yellow-500" />}
          onClick={onStarred}
          className="text-yellow-500 hover:text-yellow-600"
        />
      </div>
    );
  }

  if (isPinned) {
    return (
      <div className="flex items-center">
        <div className="w-0 group-hover:w-4 overflow-hidden transition-all duration-200">
          <ActionButton
            icon={<Star className="h-3.5 w-3.5" />}
            onClick={onStarred}
            className="text-muted-foreground hover:text-yellow-500"
          />
        </div>
        <ActionButton
          icon={<Pin className="h-3.5 w-3.5 fill-blue-500" />}
          onClick={onPinned}
          className="text-blue-500 hover:text-blue-600"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <div className="w-0 group-hover:w-4 overflow-hidden transition-all duration-200">
        <ActionButton
          icon={<Star className="h-3.5 w-3.5" />}
          onClick={onStarred}
          className="text-muted-foreground hover:text-yellow-500"
        />
      </div>
      <ActionButton
        icon={<Pin className="h-3.5 w-3.5" />}
        onClick={onPinned}
        className="text-muted-foreground hover:text-blue-500"
      />
    </div>
  );
};
