'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { FocusedGoalItem } from '@workspace/backend/convex/bff/focus';
import { Flame } from 'lucide-react';

import { FocusedGoalListItem } from './FocusedGoalListItem';
import { FocusedGoalSection } from './FocusedGoalSection';

interface FocusedUrgentSectionProps {
  goals: FocusedGoalItem[];
  onToggleComplete: (goalId: FocusedGoalItem['_id'], isComplete: boolean) => void;
  initiativeTitleMap: Map<Id<'initiatives'>, string>;
  initiativeColorMap: Map<Id<'initiatives'>, string>;
}

export function FocusedUrgentSection({
  goals,
  onToggleComplete,
  initiativeTitleMap,
  initiativeColorMap,
}: FocusedUrgentSectionProps) {
  const incompleteCount = goals.filter((g) => !g.isComplete).length;

  return (
    <FocusedGoalSection
      title="Urgent"
      description="Needs attention today."
      count={incompleteCount}
      tone="urgent"
      icon={<Flame className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />}
    >
      {goals.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          No urgent goals. Mark goals urgent when they need immediate attention.
        </p>
      ) : (
        <div className="px-4 py-2">
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
                incompleteClassName="text-red-500 dark:text-red-400"
                initiativeTitle={
                  goal.initiativeId ? initiativeTitleMap.get(goal.initiativeId) : undefined
                }
                initiativeColor={
                  goal.initiativeId ? initiativeColorMap.get(goal.initiativeId) : undefined
                }
              />
            ))}
          </ul>
        </div>
      )}
    </FocusedGoalSection>
  );
}
