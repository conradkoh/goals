'use client';

import type { FocusedGoalItem } from '@workspace/backend/convex/bff/focus';
import { Pin, Star, Target } from 'lucide-react';

import { FocusedGoalListItem } from './FocusedGoalListItem';
import { FocusedGoalSection } from './FocusedGoalSection';

interface FocusedQuarterlyGoalsSectionProps {
  goals: FocusedGoalItem[];
  onToggleComplete: (goalId: FocusedGoalItem['_id'], isComplete: boolean) => void;
}

export function FocusedQuarterlyGoalsSection({
  goals,
  onToggleComplete,
}: FocusedQuarterlyGoalsSectionProps) {
  if (goals.length === 0) return null;

  return (
    <FocusedGoalSection
      title="Quarterly Goals"
      count={goals.length}
      icon={<Target className="h-3.5 w-3.5 text-muted-foreground" />}
    >
      <div className="px-4 py-2">
        <ul className="space-y-1">
          {goals.map((goal) => {
            const indicator = goal.isStarred ? (
              <Star className="h-3 w-3 fill-amber-400 text-amber-500 dark:text-amber-400" />
            ) : goal.isPinned ? (
              <Pin className="h-3 w-3 fill-blue-500 text-blue-500 dark:text-blue-400" />
            ) : null;
            return (
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
                leadingIndicator={indicator}
              />
            );
          })}
        </ul>
      </div>
    </FocusedGoalSection>
  );
}
