import { Input } from '@/components/ui/input';
import { useDashboard } from '@/hooks/useDashboard';
import { useState } from 'react';
import { QuarterlyGoalBase, QuarterlyGoalState } from '@/types/goals';
import { GoalStarPin } from '../../goals-new/GoalStarPin';
import { Id } from '@services/backend/convex/_generated/dataModel';

interface WeekCardQuarterlyGoalsProps {
  weekNumber: number;
  quarterlyGoals: QuarterlyGoalBase[];
  quarterlyGoalStates: QuarterlyGoalState[];
}

export const WeekCardQuarterlyGoals = ({
  weekNumber,
  quarterlyGoals,
  quarterlyGoalStates,
}: WeekCardQuarterlyGoalsProps) => {
  const { createQuarterlyGoal, updateQuarterlyGoalStatus } = useDashboard();
  const [newGoalTitle, setNewGoalTitle] = useState('');

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) return;
    try {
      await createQuarterlyGoal(newGoalTitle.trim());
      setNewGoalTitle('');
    } catch (error) {
      console.error('Failed to create quarterly goal:', error);
      // TODO: Add proper error handling UI
    }
  };

  const handleToggleStatus = async (
    goalId: Id<'goals'>,
    isStarred: boolean,
    isPinned: boolean
  ) => {
    try {
      await updateQuarterlyGoalStatus({
        weekNumber,
        goalId,
        isStarred,
        isPinned,
      });
    } catch (error) {
      console.error('Failed to update goal status:', error);
      // TODO: Add proper error handling UI
    }
  };

  return (
    <div className="space-y-3">
      {/* List of goals */}
      <div className="space-y-1">
        {quarterlyGoals.map((goal, index) => {
          const state = quarterlyGoalStates[index];
          return (
            <div
              key={goal.id}
              className="group px-2 py-1.5 rounded-sm hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GoalStarPin
                  value={{
                    isStarred: state.isStarred,
                    isPinned: state.isPinned,
                  }}
                  onStarred={() =>
                    handleToggleStatus(
                      goal.id as Id<'goals'>,
                      !state.isStarred,
                      false
                    )
                  }
                  onPinned={() =>
                    handleToggleStatus(
                      goal.id as Id<'goals'>,
                      false,
                      !state.isPinned
                    )
                  }
                />
                <span className="text-sm truncate">{goal.title}</span>
              </div>
              {state.progress > 0 && (
                <span className="text-xs text-muted-foreground ml-2 tabular-nums">
                  {state.progress}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Input for new goal */}
      <div className="pt-1">
        <Input
          placeholder="Add a quarterly goal..."
          value={newGoalTitle}
          onChange={(e) => setNewGoalTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCreateGoal();
            }
          }}
          className="h-7 text-sm"
        />
      </div>
    </div>
  );
};
