'use client';

import type { FocusedGoalItem } from '@workspace/backend/convex/bff/focus';

import { FocusedTaskItem } from './FocusedTaskItem';
import { FocusedTaskSection } from './FocusedTaskSection';

interface FocusedUrgentSectionProps {
  goals: FocusedGoalItem[];
  onToggleComplete: (goalId: FocusedGoalItem['_id'], isComplete: boolean) => void;
}

export function FocusedUrgentSection({ goals, onToggleComplete }: FocusedUrgentSectionProps) {
  if (goals.length === 0) return null;

  const incompleteCount = goals.filter((g) => !g.isComplete).length;

  return (
    <FocusedTaskSection
      title="Urgent"
      count={incompleteCount}
      countColorClass="text-red-400"
      countDotColorClass="bg-red-400"
    >
      <div className="px-4 py-2">
        <ul className="space-y-1">
          {goals.map((goal) => (
            <FocusedTaskItem
              key={goal._id}
              goalId={goal._id}
              title={goal.title}
              isComplete={goal.isComplete}
              isAdhoc={goal.isAdhoc}
              year={goal.year}
              quarter={goal.quarter as 1 | 2 | 3 | 4}
              weekNumber={goal.weekNumber ?? undefined}
              onToggleComplete={onToggleComplete}
              incompleteClassName="text-red-500 dark:text-red-400"
            />
          ))}
        </ul>
      </div>
    </FocusedTaskSection>
  );
}
