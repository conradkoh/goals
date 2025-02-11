/**
 * WeeklyGoalSection component displays weekly goals grouped by their quarterly goals
 */
import React from 'react';
import { Check } from 'lucide-react';

export interface WeeklyGoal {
  id: string;
  title: string;
  path: string; // Format: /<quarter-id>/<week-id>
  isComplete: boolean; // soft completion (inferred from tasks)
  isHardComplete: boolean; // hard completion (manually set)
}

interface WeeklyGoalSectionProps {
  quarterlyGoals: { id: string; title: string; weeklyGoals: WeeklyGoal[] }[];
  onWeeklyGoalToggle: (weeklyGoalId: string) => void;
}

const WeeklyGoalItem: React.FC<{
  goal: WeeklyGoal;
  onToggle: () => void;
}> = ({ goal, onToggle }) => (
  <div
    className={`flex items-center gap-2 py-2 px-3 rounded-md transition-colors ${
      goal.isComplete ? 'bg-green-50' : 'hover:bg-gray-50'
    }`}
    data-testid={`weekly-goal-${goal.id}`}
  >
    <div
      className={`w-4 h-4 border rounded flex items-center justify-center cursor-pointer
        ${
          goal.isHardComplete
            ? 'bg-green-500 border-green-500'
            : goal.isComplete
            ? 'bg-green-50 border-green-300'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      onClick={onToggle}
    >
      {goal.isHardComplete && <Check className="h-3 w-3 text-white" />}
    </div>
    <span
      className={`text-sm flex-1 ${
        goal.isHardComplete ? 'text-gray-500 line-through' : 'text-gray-700'
      }`}
    >
      {goal.title}
    </span>
  </div>
);

export const WeeklyGoalSection: React.FC<WeeklyGoalSectionProps> = ({
  quarterlyGoals,
  onWeeklyGoalToggle,
}) => {
  return (
    <div className="space-y-4">
      {quarterlyGoals.map((quarterlyGoal) => (
        <div key={quarterlyGoal.id}>
          <h4 className="font-medium text-gray-700 mb-2">
            {quarterlyGoal.title}
          </h4>
          <div className="space-y-1 pl-4">
            {quarterlyGoal.weeklyGoals.map((goal) => (
              <WeeklyGoalItem
                key={goal.id}
                goal={goal}
                onToggle={() => onWeeklyGoalToggle(goal.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
