import { Star, Pin } from 'lucide-react';

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
    onClick={onClick}
    className={`w-4 flex justify-center items-center transition-all ${className}`}
  >
    {icon}
  </button>
);

export const GoalStarPin = ({
  value,
  onStarred,
  onPinned,
}: GoalStarPinProps) => {
  const { isStarred, isPinned } = value;

  if (isStarred) {
    return (
      <div className="flex items-center">
        <div className="w-0 group-hover:w-4 overflow-hidden transition-all duration-200">
          <ActionButton
            icon={<Pin className="h-3.5 w-3.5" />}
            onClick={onPinned}
            className="text-gray-400 hover:text-blue-500"
          />
        </div>
        <ActionButton
          icon={<Star className="h-3.5 w-3.5" />}
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
            className="text-gray-400 hover:text-yellow-500"
          />
        </div>
        <ActionButton
          icon={<Pin className="h-3.5 w-3.5" />}
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
          className="text-gray-400 hover:text-yellow-500"
        />
      </div>
      <ActionButton
        icon={<Pin className="h-3.5 w-3.5" />}
        onClick={onPinned}
        className="text-gray-400 hover:text-blue-500"
      />
    </div>
  );
};
