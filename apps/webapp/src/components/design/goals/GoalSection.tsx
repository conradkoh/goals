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
import { GoalCard, Goal, EditState } from './GoalCard';

interface GoalSectionProps {
  goals: Goal[];
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

export const GoalSection: React.FC<GoalSectionProps> = ({
  goals,
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
  const starredGoals = goals.filter((g) => g.isStarred);
  const pinnedGoals = goals.filter((g) => g.isPinned && !g.isStarred);
  const regularGoals = goals.filter((g) => !g.isStarred && !g.isPinned);

  const renderGoal = (goal: Goal) => (
    <GoalCard
      key={goal.id}
      goal={goal}
      weekIndex={weekIndex}
      isEditingTitle={
        editState?.weekIndex === weekIndex &&
        editState?.goalId === goal.id &&
        editState?.type === 'title'
      }
      isEditingProgress={
        editState?.weekIndex === weekIndex &&
        editState?.goalId === goal.id &&
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

      {/* Starred Goals */}
      {starredGoals.map(renderGoal)}

      {/* Pinned Goals */}
      {pinnedGoals.map(renderGoal)}

      {/* Regular Goals in Collapsible */}
      {regularGoals.length > 0 && (
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">
              {regularGoals.length} more items
            </span>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            {regularGoals.map(renderGoal)}
          </CollapsibleContent>
        </Collapsible>
      )}
    </section>
  );
};
