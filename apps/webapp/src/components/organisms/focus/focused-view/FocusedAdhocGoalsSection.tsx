'use client';

import type { FocusedGoalItem } from '@workspace/backend/convex/bff/focus';
import { Loader2 } from 'lucide-react';

import { FocusedGoalListItem } from './FocusedGoalListItem';
import { FocusedGoalSection } from './FocusedGoalSection';

interface FocusedAdhocGoalsSectionProps {
  goals: FocusedGoalItem[] | undefined;
  onToggleComplete: (goalId: FocusedGoalItem['_id'], isComplete: boolean) => void;
}

export function FocusedAdhocGoalsSection({
  goals,
  onToggleComplete,
}: FocusedAdhocGoalsSectionProps) {
  return (
    <FocusedGoalSection title="Tasks">
      <div className="px-4 py-2">
        {goals === undefined ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : goals.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No tasks for today.</p>
        ) : (
          <ul className="space-y-1">
            {goals.map((goal) => (
              <FocusedGoalListItem
                key={goal._id}
                goalId={goal._id}
                title={goal.title}
                isComplete={goal.isComplete}
                isAdhoc={goal.isAdhoc}
                year={goal.year}
                quarter={goal.quarter as 1 | 2 | 3 | 4}
                weekNumber={goal.weekNumber}
                onToggleComplete={onToggleComplete}
                indentLevel={goal.indentLevel}
              />
            ))}
          </ul>
        )}
      </div>
    </FocusedGoalSection>
  );
}
