import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalItemProps {
  goal: {
    id: string;
    title: string;
    progress: number;
    isStarred: boolean;
    isPinned: boolean;
  };
  weekIndex: number;
  isEditing: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onUpdateGoal: (newTitle: string) => void;
  onToggleStar: () => void;
  onTogglePin: () => void;
}

export const GoalItem: React.FC<GoalItemProps> = ({
  goal,
  isEditing,
  onStartEditing,
  onCancelEditing,
  onUpdateGoal,
  onToggleStar,
  onTogglePin,
}) => {
  const [editValue, setEditValue] = React.useState(goal.title);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onUpdateGoal(editValue);
    } else if (e.key === 'Escape') {
      onCancelEditing();
    }
  };

  const handleBlur = () => {
    onCancelEditing();
  };

  return (
    <div className="flex items-center gap-1 py-0.5 group">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-6 w-6 p-0 hover:bg-transparent',
          goal.isStarred && 'text-yellow-500'
        )}
        onClick={onToggleStar}
      >
        <Star className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-6 w-6 p-0 hover:bg-transparent',
          goal.isPinned && 'text-blue-500'
        )}
        onClick={onTogglePin}
      >
        <Pin className="h-4 w-4" />
      </Button>

      {isEditing ? (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="h-6 py-0 text-sm"
          autoFocus
        />
      ) : (
        <div
          className="flex-1 text-sm cursor-pointer hover:text-blue-500"
          onClick={onStartEditing}
        >
          {goal.title}
          <span className="ml-2 text-gray-500">[{goal.progress}/10]</span>
        </div>
      )}
    </div>
  );
};
