/**
 * DailyGoalSection component displays daily tasks grouped by their weekly goals
 */
import React from 'react';
import { Check } from 'lucide-react';
import {
  QuarterlyGoalBase,
  QuarterlyGoalWeekState,
  WeeklyGoalBase,
  TaskBase,
} from '../../../types/goals';

interface TaskView extends TaskBase {
  isComplete: boolean;
}

interface WeeklyGoalView extends WeeklyGoalBase {
  tasks: TaskView[];
}

interface DailyGoalSectionProps {
  quarterlyGoal: QuarterlyGoalBase;
  weekState: QuarterlyGoalWeekState;
  onTaskToggle: (taskId: string, weeklyGoalId: string) => void;
}

const TaskItem: React.FC<{
  task: TaskView;
  weeklyGoalId: string;
  onToggle: () => void;
}> = ({ task, onToggle }) => (
  <div
    className="flex items-center gap-2 py-1 px-3 hover:bg-gray-50 rounded-md"
    data-testid={`task-${task.id}`}
  >
    <div
      className={`w-4 h-4 border rounded flex items-center justify-center cursor-pointer ${
        task.isComplete
          ? 'bg-green-500 border-green-500'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onClick={onToggle}
    >
      {task.isComplete && <Check className="h-3 w-3 text-white" />}
    </div>
    <span
      className={`text-sm ${
        task.isComplete ? 'text-gray-500 line-through' : 'text-gray-700'
      }`}
    >
      {task.title}
    </span>
  </div>
);

export const DailyGoalSection: React.FC<DailyGoalSectionProps> = ({
  quarterlyGoal,
  weekState,
  onTaskToggle,
}) => {
  // Combine base data with week-specific state
  const weeklyGoals: WeeklyGoalView[] = quarterlyGoal.weeklyGoals.map(
    (weeklyGoal) => {
      const weeklyState = weekState.weeklyGoalStates.find(
        (state) => state.goalId === weeklyGoal.id
      );
      return {
        ...weeklyGoal,
        tasks: weeklyGoal.tasks.map((task) => {
          const taskState = weeklyState?.taskStates.find(
            (state) => state.taskId === task.id
          );
          return {
            ...task,
            isComplete: taskState?.isComplete ?? false,
          };
        }),
      };
    }
  );

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-bold text-gray-800 mb-4">{quarterlyGoal.title}</h4>
        <div className="space-y-4 pl-4">
          {weeklyGoals.map((weeklyGoal) => (
            <div key={weeklyGoal.id}>
              <h5 className="text-gray-700 mb-2">{weeklyGoal.title}</h5>
              <div className="space-y-1 pl-4">
                {weeklyGoal.tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    weeklyGoalId={weeklyGoal.id}
                    onToggle={() => onTaskToggle(task.id, weeklyGoal.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
