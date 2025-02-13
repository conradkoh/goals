/**
 * GoalSection component handles the organization and display of goals
 * It groups goals by their status (starred, pinned, regular) and provides
 * a collapsible interface for regular goals
 */

import React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../ui/collapsible';
import { Button } from '../../ui/button';
import { ChevronsUpDown } from 'lucide-react';
import { GoalCard } from './GoalCard';
import {
  QuarterlyGoalBase,
  QuarterlyGoalState,
  EditState,
} from '../../../types/goals';
import { Star, Pin } from 'lucide-react';
import { Input } from '../../ui/input';

interface QuarterlyGoalSectionProps {
  goalBase: QuarterlyGoalBase;
  weekState: QuarterlyGoalState;
  weekIndex: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editState: EditState | null;
  onStartEditing: (
    weekIndex: number,
    goalId: string,
    type: 'title' | 'progress'
  ) => void;
  onCancelEditing: () => void;
  onUpdateGoal: (weekIndex: number, goalId: string, newTitle: string) => void;
  onUpdateProgress: (
    weekIndex: number,
    goalId: string,
    newProgress: number
  ) => void;
  onToggleStar: (weekIndex: number, goalId: string) => void;
  onTogglePin: (weekIndex: number, goalId: string) => void;
  children?: React.ReactNode;
}

const GoalItem: React.FC<{
  goal: QuarterlyGoalBase & {
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
}> = ({
  goal,
  weekIndex,
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

  return (
    <div className="flex items-center gap-1 py-1 hover:bg-gray-50 rounded group">
      <div className="flex items-center gap-0.5 min-w-[60px]">
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${
            goal.isStarred
              ? 'text-yellow-500'
              : 'text-gray-400 hover:text-yellow-500'
          }`}
          onClick={onToggleStar}
        >
          <Star className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${
            goal.isPinned
              ? 'text-blue-500'
              : 'text-gray-400 hover:text-blue-500'
          }`}
          onClick={onTogglePin}
        >
          <Pin className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onUpdateGoal(editValue)}
            autoFocus
            className="h-7"
          />
        ) : (
          <span
            className="flex-1 cursor-pointer truncate"
            onClick={onStartEditing}
          >
            {goal.title}
          </span>
        )}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          [{goal.progress}/10]
        </span>
      </div>
    </div>
  );
};

export const QuarterlyGoalSection: React.FC<QuarterlyGoalSectionProps> = ({
  goalBase,
  weekState,
  weekIndex,
  isOpen,
  onOpenChange,
  editState,
  onStartEditing,
  onCancelEditing,
  onUpdateGoal,
  onUpdateProgress,
  onToggleStar,
  onTogglePin,
}) => {
  // Early return if required props are not available
  if (!goalBase || !weekState) {
    return null;
  }

  // Verify that weekState matches goalBase
  if (weekState.id !== goalBase.id) {
    console.error('Week state does not match goal base');
    return null;
  }

  // Combine base data with week-specific state for rendering
  const combinedGoalData = {
    ...goalBase,
    progress: weekState.progress,
    isStarred: weekState.isStarred,
    isPinned: weekState.isPinned,
  };

  const isEditing =
    editState?.weekIndex === weekIndex &&
    editState?.goalId === goalBase.id &&
    editState?.type === 'title';

  return (
    <GoalItem
      goal={combinedGoalData}
      weekIndex={weekIndex}
      isEditing={isEditing}
      onStartEditing={() => onStartEditing(weekIndex, goalBase.id, 'title')}
      onCancelEditing={onCancelEditing}
      onUpdateGoal={(newTitle) =>
        onUpdateGoal(weekIndex, goalBase.id, newTitle)
      }
      onToggleStar={() => onToggleStar(weekIndex, goalBase.id)}
      onTogglePin={() => onTogglePin(weekIndex, goalBase.id)}
    />
  );
};
