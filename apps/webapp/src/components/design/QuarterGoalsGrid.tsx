import React from 'react';
import { QuarterlyGoalView } from '../../types/goals/view';

// Mock data using our QuarterlyGoalView type
const mockGoals: QuarterlyGoalView[] = [
  {
    id: '1',
    title: 'Increase Sales',
    path: '/q1/1',
    quarter: 1,
    progress: 7,
    isStarred: false,
    isPinned: false,
    weeklyGoals: [],
  },
  {
    id: '2',
    title: 'Improve Customer Satisfaction',
    path: '/q1/2',
    quarter: 1,
    progress: 5,
    isStarred: false,
    isPinned: false,
    weeklyGoals: [],
  },
  {
    id: '3',
    title: 'Expand Market Reach',
    path: '/q1/3',
    quarter: 1,
    progress: 8,
    isStarred: false,
    isPinned: false,
    weeklyGoals: [],
  },
];

const QuarterGoalsGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {mockGoals.map((goal) => (
        <div
          key={goal.id}
          className="border p-4 rounded shadow hover:shadow-lg transition"
        >
          <h3 className="text-lg font-semibold">{goal.title}</h3>
          <p className="text-sm">Progress: {goal.progress}/10</p>
        </div>
      ))}
    </div>
  );
};

export default QuarterGoalsGrid;
