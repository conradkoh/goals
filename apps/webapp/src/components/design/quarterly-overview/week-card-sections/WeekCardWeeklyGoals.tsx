import { useDashboard } from '@/hooks/useDashboard';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Pin, Star } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';
import { EditableGoalTitle } from '../../goals-new/EditableGoalTitle';
import { useWeek } from '@/hooks/useWeek';
import { GoalSelector } from '../../goals-new/GoalSelector';

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
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [selectedQuarterlyGoalId, setSelectedQuarterlyGoalId] = useState<
    Id<'goals'> | undefined
  >();

  // Filter and sort important quarterly goals
  const importantQuarterlyGoals = useMemo(() => {
    return quarterlyGoals
      .filter((goal) => goal.state?.isStarred || goal.state?.isPinned)
      .sort((a, b) => {
        // First by starred status
        if (a.state?.isStarred && !b.state?.isStarred) return -1;
        if (!a.state?.isStarred && b.state?.isStarred) return 1;
        // Then by pinned status
        if (a.state?.isPinned && !b.state?.isPinned) return -1;
        if (!a.state?.isPinned && b.state?.isPinned) return 1;
        // Finally alphabetically
        return a.title.localeCompare(b.title);
      });
  }, [quarterlyGoals]);

  // Auto-select first goal when list changes and nothing is selected
  useEffect(() => {
    if (importantQuarterlyGoals.length > 0 && !selectedQuarterlyGoalId) {
      setSelectedQuarterlyGoalId(importantQuarterlyGoals[0]._id);
    }
  }, [importantQuarterlyGoals, selectedQuarterlyGoalId]);

  const handleCreateWeeklyGoal = async () => {
    if (!newGoalTitle.trim() || !selectedQuarterlyGoalId) return;

    try {
      await createWeeklyGoal({
        title: newGoalTitle.trim(),
        parentId: selectedQuarterlyGoalId,
        weekNumber,
      });
      // Clear the input after successful creation
      setNewGoalTitle('');
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
      throw error;
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
      <div className="px-3">
        <CreateGoalInput
          placeholder="Add a weekly goal..."
          value={newGoalTitle}
          onChange={setNewGoalTitle}
          onSubmit={handleCreateWeeklyGoal}
        >
          <GoalSelector
            goals={importantQuarterlyGoals}
            value={selectedQuarterlyGoalId}
            onChange={setSelectedQuarterlyGoalId}
            placeholder="Select quarterly goal"
          />
        </CreateGoalInput>
      </div>

      {importantQuarterlyGoals.length === 0 ? (
        <div className="text-sm text-muted-foreground italic px-3">
          No starred or pinned quarterly goals
        </div>
      ) : (
        importantQuarterlyGoals.map((goal) => {
          const weeklyGoals = goal.children;

          return (
            <div key={goal._id} className="px-3 space-y-2">
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
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
