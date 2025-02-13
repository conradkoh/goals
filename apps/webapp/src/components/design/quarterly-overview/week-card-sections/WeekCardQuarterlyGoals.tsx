import { Input } from '@/components/ui/input';
import { useDashboard } from '@/hooks/useDashboard';
import { useState } from 'react';
import { QuarterlyGoalBase, QuarterlyGoalState } from '@/types/goals';
import { GoalStarPin } from '../../goals-new/GoalStarPin';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';
import { EditableGoalTitle } from '../../goals-new/EditableGoalTitle';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) return;
    try {
      const goalId = await createQuarterlyGoal(newGoalTitle.trim());
      // If not expanded, immediately pin the goal so it's visible
      if (!isExpanded && goalId) {
        await updateQuarterlyGoalStatus({
          weekNumber,
          goalId,
          isStarred: false,
          isPinned: true,
        });
      }
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

  // Split goals into important (starred/pinned) and other
  const importantGoals = sortedGoals.filter(
    ({ state }) => state.isStarred || state.isPinned
  );
  const otherGoals = sortedGoals.filter(
    ({ state }) => !state.isStarred && !state.isPinned
  );

  const renderGoal = ({
    goal,
    state,
  }: {
    goal: QuarterlyGoalBase;
    state: QuarterlyGoalState;
  }) => (
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
            handleToggleStatus(goal.id as Id<'goals'>, !state.isStarred, false)
          }
          onPinned={() =>
            handleToggleStatus(goal.id as Id<'goals'>, false, !state.isPinned)
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
  );

  return (
    <div className="space-y-3">
      {/* List of goals */}
      <div className="space-y-1">
        {/* Important goals are always visible */}
        {importantGoals.map(renderGoal)}

        {/* Other goals are shown when expanded */}
        {otherGoals.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-between"
              >
                <span>
                  {isExpanded ? 'Show less' : `${otherGoals.length} more goals`}
                </span>
                <ChevronsUpDown className="h-3 w-3" />
              </Button>
            </div>
            {isExpanded && (
              <div className="space-y-1 animate-in slide-in-from-top-1 duration-100">
                {otherGoals.map(renderGoal)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input for new goal */}
      <div className="pt-1">
        <CreateGoalInput
          placeholder={
            isExpanded
              ? 'Add a quarterly goal...'
              : 'Add a pinned quarterly goal...'
          }
          value={newGoalTitle}
          onChange={setNewGoalTitle}
          onSubmit={handleCreateGoal}
        />
      </div>
    </div>
  );
};
