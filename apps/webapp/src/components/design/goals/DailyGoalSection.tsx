/**
 * DailyGoalSection component displays daily tasks grouped by their weekly and quarterly goals
 */
import React from 'react';
import { Check } from 'lucide-react';

export interface DailyTask {
  id: string;
  title: string;
  isComplete: boolean;
  path: string; // Format: /<quarter-id>/<week-id>/<task-id>
}

export interface WeeklyGoal {
  id: string;
  title: string;
  path: string; // Format: /<quarter-id>/<week-id>
  isComplete: boolean;
  isHardComplete: boolean;
  tasks: DailyTask[];
}

export interface QuarterlyGoal {
  id: string;
  title: string;
  path: string; // Format: /<quarter-id>
  weeklyGoals: WeeklyGoal[];
}

interface DailyGoalSectionProps {
  quarterlyGoals: QuarterlyGoal[];
  onTaskToggle: (taskId: string, weeklyGoalId: string) => void;
  onWeeklyGoalToggle: (weeklyGoalId: string) => void;
}

const TaskItem: React.FC<{
  task: DailyTask;
  onToggle: () => void;
}> = ({ task, onToggle }) => (
  <div
    className="flex items-center gap-2 py-1 cursor-pointer group pl-8"
    onClick={onToggle}
    data-testid={`task-${task.id}`}
  >
    <div
      className={`w-4 h-4 border rounded flex items-center justify-center
        ${
          task.isComplete
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 group-hover:border-gray-400'
        }`}
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

const WeeklyGoalSection: React.FC<{
  weeklyGoal: WeeklyGoal;
  onTaskToggle: (taskId: string) => void;
  onWeeklyGoalToggle: () => void;
}> = ({ weeklyGoal, onTaskToggle, onWeeklyGoalToggle }) => (
  <div
    className={`mb-4 p-3 rounded-md transition-colors ${
      weeklyGoal.isComplete ? 'bg-green-50' : ''
    }`}
    data-testid={`weekly-goal-${weeklyGoal.id}`}
  >
    <div className="flex items-center gap-2 mb-3 group">
      <div
        className={`w-4 h-4 border rounded flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity
          ${
            weeklyGoal.isHardComplete
              ? 'bg-green-500 border-green-500'
              : weeklyGoal.isComplete
              ? 'bg-green-50 border-green-300'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        onClick={onWeeklyGoalToggle}
      >
        {weeklyGoal.isHardComplete && <Check className="h-3 w-3 text-white" />}
      </div>
      <h4 className="text-sm font-semibold text-gray-700 flex-grow">
        {weeklyGoal.title}
      </h4>
    </div>
    <div className="space-y-1">
      {weeklyGoal.tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={() => onTaskToggle(task.id)}
        />
      ))}
    </div>
  </div>
);

export const DailyGoalSection: React.FC<DailyGoalSectionProps> = ({
  quarterlyGoals,
  onTaskToggle,
  onWeeklyGoalToggle,
}) => {
  return (
    <div className="space-y-6">
      {quarterlyGoals.map((quarterlyGoal) => (
        <div
          key={quarterlyGoal.id}
          data-testid={`quarterly-${quarterlyGoal.id}`}
        >
          <h3 className="font-semibold text-gray-800 mb-3">
            {quarterlyGoal.title}
          </h3>
          <div className="pl-4">
            {quarterlyGoal.weeklyGoals.map((weeklyGoal) => (
              <WeeklyGoalSection
                key={weeklyGoal.id}
                weeklyGoal={weeklyGoal}
                onTaskToggle={(taskId) => onTaskToggle(taskId, weeklyGoal.id)}
                onWeeklyGoalToggle={() => onWeeklyGoalToggle(weeklyGoal.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
