'use client';

import type { FocusedGoalItem } from '@workspace/backend/convex/bff/focus';

import { FocusedGoalListItem } from './FocusedGoalListItem';
import { FocusedGoalSection } from './FocusedGoalSection';

interface FocusedDailyGoalsSectionProps {
  goals: FocusedGoalItem[];
  onToggleComplete: (goalId: FocusedGoalItem['_id'], isComplete: boolean) => void;
}

export function FocusedDailyGoalsSection({
  goals,
  onToggleComplete,
}: FocusedDailyGoalsSectionProps) {
  const incompleteCount = goals.filter((g) => !g.isComplete).length;

  return (
    <FocusedGoalSection title="Daily Goals" count={incompleteCount}>
      {goals.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">No daily goals for today</p>
      ) : (
        <div className="px-4 py-2">
          <ul className="space-y-1">
            {goals.map((goal) => (
              <FocusedGoalListItem
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
      )}
    </FocusedGoalSection>
  );
}
