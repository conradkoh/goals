import React from 'react';

interface Goal {
  id: string;
  title: string;
  progress: number; // out of 10
}

const mockGoals: Goal[] = [
  { id: '1', title: 'Increase Sales', progress: 7 },
  { id: '2', title: 'Improve Customer Satisfaction', progress: 5 },
  { id: '3', title: 'Expand Market Reach', progress: 8 },
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
