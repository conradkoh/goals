import {
  QuarterlyGoalBase,
  QuarterlyGoalState,
  WeeklyGoalBase,
} from '@/types/goals';
import { Star, Pin } from 'lucide-react';

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
  console.log('WeekCardWeeklyGoals props:', {
    weekNumber,
    quarterlyGoals: quarterlyGoals.map((g) => ({
      id: g.id,
      title: g.title,
      weeklyGoals: g.weeklyGoals.length,
    })),
    quarterlyGoalStates: quarterlyGoalStates.map((s) => ({
      isStarred: s.isStarred,
      isPinned: s.isPinned,
    })),
  });

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
    const weeklyGoals = quarterlyGoal.weeklyGoals.filter((goal) =>
      goal.path.includes(
        `/quarters/${quarterlyGoal.quarter}/weeks/${weekNumber}`
      )
    );
    console.log('Weekly goals for', quarterlyGoal.title, ':', weeklyGoals);
    return weeklyGoals;
  };

  // Debug output for important goals
  console.log(
    'Important quarterly goals:',
    importantQuarterlyGoals.map((g) => ({
      title: g.title,
      weeklyGoals: g.weeklyGoals.length,
    }))
  );

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
              {weeklyGoals.length > 0 ? (
                <div className="pl-6 space-y-1">
                  {weeklyGoals.map((weeklyGoal) => (
                    <WeeklyGoal key={weeklyGoal.id} goal={weeklyGoal} />
                  ))}
                </div>
              ) : (
                <div className="pl-6 text-sm text-muted-foreground italic">
                  No weekly goals for this week
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
