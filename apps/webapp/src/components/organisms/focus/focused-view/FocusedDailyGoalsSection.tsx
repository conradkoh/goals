'use client';

import type { FocusedGoalItem } from '@workspace/backend/convex/bff/focus';

import { FocusedTaskItem } from './FocusedTaskItem';
import { FocusedTaskSection } from './FocusedTaskSection';

interface FocusedDailyGoalsSectionProps {
  goals: FocusedGoalItem[];
  onToggleComplete: (goalId: FocusedGoalItem['_id'], isComplete: boolean) => void;
}

export function FocusedDailyGoalsSection({
  goals,
  onToggleComplete,
}: FocusedDailyGoalsSectionProps) {
  if (goals.length === 0) return null;

  const incompleteCount = goals.filter((g) => !g.isComplete).length;

  return (
    <FocusedTaskSection title="Daily Goals" count={incompleteCount}>
      <div className="px-4 py-2">
        <ul className="space-y-1">
          {goals.map((goal) => (
            <FocusedTaskItem
              key={goal._id}
              goalId={goal._id}
              title={goal.title}
              isComplete={goal.isComplete}
              isAdhoc={false}
              year={goal.year}
              quarter={goal.quarter as 1 | 2 | 3 | 4}
              weekNumber={goal.weekNumber}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </ul>
      </div>
    </FocusedTaskSection>
  );
}
