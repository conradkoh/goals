import { useDashboard } from '@/hooks/useDashboard';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Pin, Star } from 'lucide-react';
import { useState } from 'react';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';
import { EditableGoalTitle } from '../../goals-new/EditableGoalTitle';
import { useWeek } from '@/hooks/useWeek';

interface WeekCardWeeklyGoalsProps {
  weekNumber: number;
}

// Internal component for rendering a quarterly goal header with its status icons
const QuarterlyGoalHeader = ({
  goal,
}: {
  goal: GoalWithDetailsAndChildren;
}) => (
  <div className="flex items-center gap-2 font-semibold text-sm">
    <div className="flex items-center gap-1">
      {goal.state?.isStarred && (
        <Star className="h-3.5 w-3.5 text-yellow-500" />
      )}
      {goal.state?.isPinned && <Pin className="h-3.5 w-3.5 text-blue-500" />}
    </div>
    {goal.title}
  </div>
);

// Internal component for rendering a weekly goal
const WeeklyGoal = ({
  goal,
  onUpdateTitle,
  onDelete,
}: {
  goal: GoalWithDetailsAndChildren;
  onUpdateTitle: (goalId: Id<'goals'>, newTitle: string) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
}) => (
  <div className="px-2 py-1 text-sm hover:bg-gray-50 rounded-sm">
    <EditableGoalTitle
      title={goal.title}
      onSubmit={(newTitle) => onUpdateTitle(goal._id as Id<'goals'>, newTitle)}
      onDelete={() => onDelete(goal._id as Id<'goals'>)}
    />
  </div>
);

export const WeekCardWeeklyGoals = ({
  weekNumber,
}: WeekCardWeeklyGoalsProps) => {
  const { createWeeklyGoal, updateQuarterlyGoalTitle, deleteQuarterlyGoal } =
    useDashboard();
  const { quarterlyGoals } = useWeek();
  const [newGoalTitles, setNewGoalTitles] = useState<Record<string, string>>(
    {}
  );

  // Filter for important (starred/pinned) quarterly goals
  const importantQuarterlyGoals = quarterlyGoals.filter((goal, index) => {
    return goal.state?.isStarred || goal.state?.isPinned;
  });

  const handleCreateWeeklyGoal = async (
    quarterlyGoal: GoalWithDetailsAndChildren
  ) => {
    const title = newGoalTitles[quarterlyGoal._id];
    if (!title?.trim()) return;

    try {
      await createWeeklyGoal({
        title: title.trim(),
        parentId: quarterlyGoal._id as Id<'goals'>,
        weekNumber,
      });
      // Clear the input after successful creation
      setNewGoalTitles((prev) => ({ ...prev, [quarterlyGoal._id]: '' }));
    } catch (error) {
      console.error('Failed to create weekly goal:', error);
    }
  };

  const handleUpdateWeeklyGoalTitle = async (
    goalId: Id<'goals'>,
    newTitle: string
  ) => {
    try {
      await updateQuarterlyGoalTitle({
        goalId,
        title: newTitle,
      });
    } catch (error) {
      console.error('Failed to update weekly goal title:', error);
      throw error; // Re-throw to let EditableGoalTitle handle the error state
    }
  };

  const handleDeleteWeeklyGoal = async (goalId: Id<'goals'>) => {
    try {
      await deleteQuarterlyGoal({
        goalId,
      });
    } catch (error) {
      console.error('Failed to delete weekly goal:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      {importantQuarterlyGoals.length === 0 ? (
        <div className="text-sm text-muted-foreground italic">
          No starred or pinned quarterly goals
        </div>
      ) : (
        importantQuarterlyGoals.map((goal, index) => {
          const weeklyGoals = goal.children;

          return (
            <div key={goal._id} className="space-y-2">
              <QuarterlyGoalHeader goal={goal} />
              <div className="pl-6 space-y-1">
                {weeklyGoals.map((weeklyGoal) => (
                  <WeeklyGoal
                    key={weeklyGoal._id}
                    goal={weeklyGoal}
                    onUpdateTitle={handleUpdateWeeklyGoalTitle}
                    onDelete={handleDeleteWeeklyGoal}
                  />
                ))}
                <CreateGoalInput
                  placeholder="Add a weekly goal..."
                  value={newGoalTitles[goal._id] || ''}
                  onChange={(value) =>
                    setNewGoalTitles((prev) => ({
                      ...prev,
                      [goal._id]: value,
                    }))
                  }
                  onSubmit={() => handleCreateWeeklyGoal(goal)}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
