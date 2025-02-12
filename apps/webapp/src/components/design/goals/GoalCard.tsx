/**
 * GoalCard component handles the display and interaction of individual goals
 * It supports inline editing, progress updates, and status toggles (star/pin)
 */

import React, { ChangeEvent, KeyboardEvent, MouseEvent } from 'react';
import { Star, Pin, Check, X } from 'lucide-react';
import { Input } from '../../ui/input';
import { EditState, QuarterlyGoalBase } from '../../../types/goals';

// Local interface for the goal with state properties
interface QuarterlyGoalWithState extends QuarterlyGoalBase {
  isStarred: boolean;
  isPinned: boolean;
  progress: number;
}

interface GoalCardProps {
  goal: QuarterlyGoalWithState;
  weekIndex: number;
  isEditingTitle: boolean;
  isEditingProgress: boolean;
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
  editState: EditState | null;
}

/**
 * A reusable button component for goal actions with consistent styling
 */
const ActionButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
  'data-testid'?: string;
}> = ({ icon, onClick, className = '', ...props }) => (
  <button
    onClick={onClick}
    className={`w-4 flex justify-center items-center transition-colors ${className}`}
    {...props}
  >
    {icon}
  </button>
);

/**
 * EditableField component handles the inline editing UI for both title and progress
 */
const EditableField: React.FC<{
  value: string;
  onConfirm: (value: string) => void;
  inputClassName: string;
  onCancel: () => void;
  isProgress?: boolean;
  onProgressChange?: (value: number) => void;
}> = ({
  value,
  onConfirm,
  inputClassName,
  onCancel,
  isProgress,
  onProgressChange,
}) => (
  <div className="relative">
    <Input
      type="text"
      className={inputClassName}
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        if (isProgress && onProgressChange) {
          const match = e.target.value.match(/\[?(\d+)(?:\/10)?\]?/);
          if (match) {
            const value = parseInt(match[1]);
            onProgressChange(value);
          }
        }
      }}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          onConfirm(e.currentTarget.value);
        } else if (e.key === 'Escape') {
          onCancel();
        }
      }}
      autoFocus
      onClick={(e: MouseEvent) => e.stopPropagation()}
    />
    <div className="absolute -bottom-6 left-0 flex items-center gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onConfirm(e.currentTarget.form?.querySelector('input')?.value || '');
        }}
        className="p-1 hover:bg-green-50 rounded text-green-600"
        aria-label="Confirm"
      >
        <Check className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="p-1 hover:bg-red-50 rounded text-red-600"
        aria-label="Cancel"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  </div>
);

/**
 * GoalActionButtons component handles the star/pin toggle buttons
 */
const GoalActionButtons: React.FC<{
  goal: QuarterlyGoalWithState;
  weekIndex: number;
  onToggleStar: (weekIndex: number, goalId: string) => void;
  onTogglePin: (weekIndex: number, goalId: string) => void;
}> = ({ goal, weekIndex, onToggleStar, onTogglePin }) => {
  if (goal.isStarred) {
    return (
      <div
        className="flex items-center gap-1"
        data-testid="goal-starred-actions"
      >
        <ActionButton
          icon={<Pin className="h-3.5 w-3.5" />}
          onClick={() => {
            onToggleStar(weekIndex, goal.id);
            onTogglePin(weekIndex, goal.id);
          }}
          className="text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100"
          data-testid="goal-action-button"
        />
        <ActionButton
          icon={<Star className="h-3.5 w-3.5" />}
          onClick={() => onToggleStar(weekIndex, goal.id)}
          className="text-yellow-500 hover:text-yellow-600"
          data-testid="goal-action-button"
        />
      </div>
    );
  }

  if (goal.isPinned) {
    return (
      <div
        className="flex items-center gap-1"
        data-testid="goal-pinned-actions"
      >
        <ActionButton
          icon={<Star className="h-3.5 w-3.5" />}
          onClick={() => {
            onTogglePin(weekIndex, goal.id);
            onToggleStar(weekIndex, goal.id);
          }}
          className="text-gray-400 hover:text-yellow-500 opacity-0 group-hover:opacity-100"
          data-testid="goal-action-button"
        />
        <ActionButton
          icon={<Pin className="h-3.5 w-3.5" />}
          onClick={() => onTogglePin(weekIndex, goal.id)}
          className="text-blue-500 hover:text-blue-600"
          data-testid="goal-action-button"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" data-testid="goal-default-actions">
      <ActionButton
        icon={<Star className="h-3.5 w-3.5" />}
        onClick={() => onToggleStar(weekIndex, goal.id)}
        className="text-gray-400 hover:text-yellow-500"
        data-testid="goal-action-button"
      />
      <ActionButton
        icon={<Pin className="h-3.5 w-3.5" />}
        onClick={() => onTogglePin(weekIndex, goal.id)}
        className="text-gray-400 hover:text-blue-500"
        data-testid="goal-action-button"
      />
    </div>
  );
};

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  weekIndex,
  isEditingTitle,
  isEditingProgress,
  onStartEditing,
  onCancelEditing,
  onUpdateGoal,
  onUpdateProgress,
  onToggleStar,
  onTogglePin,
  editState,
}) => {
  return (
    <div
      className="group flex items-center p-2 hover:bg-gray-50 rounded"
      data-testid={`goal-item-${goal.id}`}
    >
      {/* Action buttons container */}
      <div className="flex items-center" data-testid="goal-actions-container">
        <div
          className="flex items-center gap-2"
          data-testid="goal-icons-container"
        >
          <GoalActionButtons
            goal={goal}
            weekIndex={weekIndex}
            onToggleStar={onToggleStar}
            onTogglePin={onTogglePin}
          />
        </div>
      </div>

      {/* Goal content */}
      <div className="flex-1 ml-2">
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <EditableField
              value={editState?.originalValue || goal.title}
              onConfirm={(value) => onUpdateGoal(weekIndex, goal.id, value)}
              inputClassName="h-6 text-sm py-0 px-1"
              onCancel={onCancelEditing}
            />
          ) : (
            <div
              className="flex-1 text-sm cursor-pointer"
              onClick={() => onStartEditing(weekIndex, goal.id, 'title')}
            >
              {goal.title}
            </div>
          )}

          {isEditingProgress ? (
            <EditableField
              value={editState?.originalValue || `[${goal.progress}/10]`}
              onConfirm={(value) => {
                const match = value.match(/\[?(\d+)(?:\/10)?\]?/);
                if (match) {
                  const progress = parseInt(match[1]);
                  onUpdateProgress(weekIndex, goal.id, progress);
                }
              }}
              inputClassName="h-6 text-sm py-0 px-1 w-16 text-right"
              onCancel={onCancelEditing}
              isProgress
              onProgressChange={(value) =>
                onUpdateProgress(weekIndex, goal.id, value)
              }
            />
          ) : (
            <div
              className="text-sm text-gray-500 cursor-pointer"
              onClick={() => onStartEditing(weekIndex, goal.id, 'progress')}
            >
              [{goal.progress}/10]
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
