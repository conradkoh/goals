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
  QuarterlyGoalWeekState,
  EditState,
} from '../../../types/goals';

interface QuarterlyGoalSectionProps {
  goalBase: QuarterlyGoalBase;
  weekState: QuarterlyGoalWeekState; // Required
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
}

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
  if (weekState.goalId !== goalBase.id) {
    console.error('Week state does not match goal base');
    return null;
  }

  // Combine base data with week-specific state for rendering
  const combinedGoalData = {
    ...goalBase,
    progress: weekState.progress,
    isStarred: weekState.isStarred,
    isPinned: weekState.isPinned,
    weeklyGoals: goalBase.weeklyGoals.map((weeklyGoal) => {
      const weeklyState = weekState.weeklyGoalStates.find(
        (state) => state.goalId === weeklyGoal.id
      );
      if (!weeklyState) {
        console.error(`No weekly state found for goal ${weeklyGoal.id}`);
        return {
          ...weeklyGoal,
          isComplete: false,
          isHardComplete: false,
          tasks: weeklyGoal.tasks.map((task) => ({
            ...task,
            isComplete: false,
            date: '',
          })),
        };
      }
      return {
        ...weeklyGoal,
        isComplete: weeklyState.isComplete,
        isHardComplete: weeklyState.isHardComplete,
        tasks: weeklyGoal.tasks.map((task) => {
          const taskState = weeklyState.taskStates.find(
            (state) => state.taskId === task.id
          );
          if (!taskState) {
            console.error(`No task state found for task ${task.id}`);
            return {
              ...task,
              isComplete: false,
              date: '',
            };
          }
          return {
            ...task,
            isComplete: taskState.isComplete,
            date: taskState.date,
          };
        }),
      };
    }),
  };

  // Filter goals based on their state
  const isStarred = weekState.isStarred;
  const isPinned = weekState.isPinned;

  // Determine if we should show all goals without collapsible
  const shouldShowAllGoals = !isStarred && !isPinned;

  const renderGoal = () => (
    <GoalCard
      key={goalBase.id}
      goal={combinedGoalData}
      weekIndex={weekIndex}
      isEditingTitle={
        editState?.weekIndex === weekIndex &&
        editState?.goalId === goalBase.id &&
        editState?.type === 'title'
      }
      isEditingProgress={
        editState?.weekIndex === weekIndex &&
        editState?.goalId === goalBase.id &&
        editState?.type === 'progress'
      }
      editState={editState}
      onStartEditing={onStartEditing}
      onCancelEditing={onCancelEditing}
      onUpdateGoal={onUpdateGoal}
      onUpdateProgress={onUpdateProgress}
      onToggleStar={onToggleStar}
      onTogglePin={onTogglePin}
    />
  );

  return (
    <section className="mb-4">
      <h3 className="font-semibold mb-2">Quarter Goals Progress</h3>

      {/* Render based on starred/pinned status */}
      {isStarred && renderGoal()}
      {!isStarred && isPinned && renderGoal()}

      {/* Regular Goals - either in Collapsible or direct based on condition */}
      {shouldShowAllGoals
        ? renderGoal()
        : !isStarred &&
          !isPinned && (
            <Collapsible open={isOpen} onOpenChange={onOpenChange}>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">1 more item</span>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ChevronsUpDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>{renderGoal()}</CollapsibleContent>
            </Collapsible>
          )}
    </section>
  );
};
