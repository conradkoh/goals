'use client';

import type { FocusedGoalItem } from '@workspace/backend/convex/bff/focus';
import type { ReactNode } from 'react';

import { FocusedGoalListItem } from './FocusedGoalListItem';

interface FocusedGoalItemsListProps {
  goals: FocusedGoalItem[];
  onToggleComplete: (goalId: FocusedGoalItem['_id'], isComplete: boolean) => void;
  incompleteClassName?: string;
  footer?: ReactNode;
}

export function FocusedGoalItemsList({
  goals,
  onToggleComplete,
  incompleteClassName,
  footer,
}: FocusedGoalItemsListProps) {
  return (
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
          weekNumber={goal.weekNumber ?? undefined}
          onToggleComplete={onToggleComplete}
          incompleteClassName={incompleteClassName}
          indentLevel={goal.indentLevel}
        />
      ))}
      {footer}
    </ul>
  );
}
