import { useDashboard } from '@/hooks/useDashboard';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { QuarterlyGoalInWeek } from '@services/backend/src/usecase/getWeekDetails';
import { Pin, Star } from 'lucide-react';
import { useState } from 'react';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';

interface WeekCardWeeklyGoalsProps {
  weekNumber: number;
  quarterlyGoals: QuarterlyGoalInWeek[];
}

// Internal component for rendering a quarterly goal header with its status icons
const QuarterlyGoalHeader = ({ goal }: { goal: QuarterlyGoalInWeek }) => (
  <div className="flex items-center gap-2 font-semibold text-sm">
    <div className="flex items-center gap-1">
      {goal.weeklyGoal?.isStarred && (
        <Star className="h-3.5 w-3.5 text-yellow-500" />
      )}
      {goal.weeklyGoal?.isPinned && (
        <Pin className="h-3.5 w-3.5 text-blue-500" />
      )}
    </div>
    {goal.title}
  </div>
);

// Internal component for rendering a weekly goal
const WeeklyGoal = ({ goal }: { goal: QuarterlyGoalInWeek }) => (
  <div className="px-2 py-1 text-sm hover:bg-gray-50 rounded-sm">
    {goal.title}
  </div>
);

export const WeekCardWeeklyGoals = ({
  weekNumber,
  quarterlyGoals,
}: WeekCardWeeklyGoalsProps) => {
  const { createWeeklyGoal } = useDashboard();
  const [newGoalTitles, setNewGoalTitles] = useState<Record<string, string>>(
    {}
  );

  // Filter for important (starred/pinned) quarterly goals
  const importantQuarterlyGoals = quarterlyGoals.filter((goal, index) => {
    return goal.weeklyGoal?.isStarred || goal.weeklyGoal?.isPinned;
  });

  const handleCreateWeeklyGoal = async (quarterlyGoal: QuarterlyGoalInWeek) => {
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
                  <WeeklyGoal key={weeklyGoal._id} goal={weeklyGoal} />
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
