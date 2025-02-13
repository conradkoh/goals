import {
  QuarterlyGoalBase,
  QuarterlyGoalState,
  WeeklyGoalBase,
} from '@/types/goals';
import { Star, Pin } from 'lucide-react';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';
import { useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { Id } from '@services/backend/convex/_generated/dataModel';

interface WeekCardWeeklyGoalsProps {
  weekNumber: number;
  quarterlyGoals: QuarterlyGoalBase[];
  quarterlyGoalStates: QuarterlyGoalState[];
}

// Internal component for rendering a quarterly goal header with its status icons
const QuarterlyGoalHeader = ({
  goal,
  state,
}: {
  goal: QuarterlyGoalBase;
  state: QuarterlyGoalState;
}) => (
  <div className="flex items-center gap-2 font-semibold text-sm">
    <div className="flex items-center gap-1">
      {state.isStarred && <Star className="h-3.5 w-3.5 text-yellow-500" />}
      {state.isPinned && <Pin className="h-3.5 w-3.5 text-blue-500" />}
    </div>
    {goal.title}
  </div>
);

// Internal component for rendering a weekly goal
const WeeklyGoal = ({ goal }: { goal: WeeklyGoalBase }) => (
  <div className="px-2 py-1 text-sm hover:bg-gray-50 rounded-sm">
    {goal.title}
  </div>
);

export const WeekCardWeeklyGoals = ({
  weekNumber,
  quarterlyGoals,
  quarterlyGoalStates,
}: WeekCardWeeklyGoalsProps) => {
  const { createWeeklyGoal } = useDashboard();
  const [newGoalTitles, setNewGoalTitles] = useState<Record<string, string>>(
    {}
  );

  // Filter for important (starred/pinned) quarterly goals
  const importantQuarterlyGoals = quarterlyGoals.filter((goal, index) => {
    const state = quarterlyGoalStates[index];

    return state.isStarred || state.isPinned;
  });

  // Get the states for the important goals
  const importantGoalStates = importantQuarterlyGoals.map((goal) => {
    const index = quarterlyGoals.findIndex((g) => g.id === goal.id);
    return quarterlyGoalStates[index];
  });

  // Filter weekly goals for the current week
  const getWeeklyGoals = (quarterlyGoal: QuarterlyGoalBase) => {
    return quarterlyGoal.weeklyGoals.filter(
      (goal) => goal.weekNumber === weekNumber
    );
  };

  const handleCreateWeeklyGoal = async (quarterlyGoal: QuarterlyGoalBase) => {
    const title = newGoalTitles[quarterlyGoal.id];
    if (!title?.trim()) return;

    try {
      await createWeeklyGoal({
        title: title.trim(),
        parentId: quarterlyGoal.id as Id<'goals'>,
        weekNumber,
      });
      // Clear the input after successful creation
      setNewGoalTitles((prev) => ({ ...prev, [quarterlyGoal.id]: '' }));
    } catch (error) {
      console.error('Failed to create weekly goal:', error);
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
          const state = importantGoalStates[index];
          const weeklyGoals = getWeeklyGoals(goal);

          return (
            <div key={goal.id} className="space-y-2">
              <QuarterlyGoalHeader goal={goal} state={state} />
              <div className="pl-6 space-y-1">
                {weeklyGoals.map((weeklyGoal) => (
                  <WeeklyGoal key={weeklyGoal.id} goal={weeklyGoal} />
                ))}
                <CreateGoalInput
                  placeholder="Add a weekly goal..."
                  value={newGoalTitles[goal.id] || ''}
                  onChange={(value) =>
                    setNewGoalTitles((prev) => ({ ...prev, [goal.id]: value }))
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
