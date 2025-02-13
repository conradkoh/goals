import { Input } from '@/components/ui/input';
import { useDashboard } from '@/hooks/useDashboard';
import { useState } from 'react';
import { QuarterlyGoalBase, QuarterlyGoalState } from '@/types/goals';
import { GoalStarPin } from '../../goals-new/GoalStarPin';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';
import { EditableGoalTitle } from '../../goals-new/EditableGoalTitle';
import { Id } from '@services/backend/convex/_generated/dataModel';

interface WeekCardQuarterlyGoalsProps {
  weekNumber: number;
  quarterlyGoals: QuarterlyGoalBase[];
  quarterlyGoalStates: QuarterlyGoalState[];
}

// Helper function to sort goals by status and title
const sortGoals = (
  goals: QuarterlyGoalBase[],
  states: QuarterlyGoalState[]
): { goal: QuarterlyGoalBase; state: QuarterlyGoalState }[] => {
  // Create pairs of goals and their states
  const pairs = goals.map((goal, index) => ({
    goal,
    state: states[index],
  }));

  // Sort function that prioritizes starred -> pinned -> neither
  // Within each group, sort alphabetically by title
  return pairs.sort((a, b) => {
    // First, group by status
    if (a.state.isStarred && !b.state.isStarred) return -1;
    if (!a.state.isStarred && b.state.isStarred) return 1;
    if (a.state.isPinned && !b.state.isPinned) return -1;
    if (!a.state.isPinned && b.state.isPinned) return 1;

    // Within the same status group, sort alphabetically
    return a.goal.title.localeCompare(b.goal.title);
  });
};

export const WeekCardQuarterlyGoals = ({
  weekNumber,
  quarterlyGoals,
  quarterlyGoalStates,
}: WeekCardQuarterlyGoalsProps) => {
  const {
    createQuarterlyGoal,
    updateQuarterlyGoalStatus,
    updateQuarterlyGoalTitle,
    deleteQuarterlyGoal,
  } = useDashboard();
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

  const handleUpdateTitle = async (goalId: Id<'goals'>, newTitle: string) => {
    try {
      await updateQuarterlyGoalTitle({
        goalId,
        title: newTitle,
      });
    } catch (error) {
      console.error('Failed to update goal title:', error);
      throw error; // Re-throw to let EditableGoalTitle handle the error state
    }
  };

  const handleDeleteGoal = async (goalId: Id<'goals'>) => {
    try {
      await deleteQuarterlyGoal({
        goalId,
      });
    } catch (error) {
      console.error('Failed to delete goal:', error);
      throw error;
    }
  };

  // Sort the goals before rendering
  const sortedGoals = sortGoals(quarterlyGoals, quarterlyGoalStates);

  return (
    <div className="space-y-3">
      {/* List of goals */}
      <div className="space-y-1">
        {sortedGoals.map(({ goal, state }) => (
          <div
            key={goal.id}
            className="group px-2 py-1.5 rounded-sm hover:bg-gray-50 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 min-w-0 flex-grow">
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
              <EditableGoalTitle
                title={goal.title}
                onSubmit={(newTitle) =>
                  handleUpdateTitle(goal.id as Id<'goals'>, newTitle)
                }
                onDelete={() => handleDeleteGoal(goal.id as Id<'goals'>)}
              />
            </div>
            {state.progress > 0 && (
              <span className="text-xs text-muted-foreground ml-2 tabular-nums">
                {state.progress}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Input for new goal */}
      <div className="pt-1">
        <CreateGoalInput
          placeholder="Add a quarterly goal..."
          value={newGoalTitle}
          onChange={setNewGoalTitle}
          onSubmit={handleCreateGoal}
        />
      </div>
    </div>
  );
};
