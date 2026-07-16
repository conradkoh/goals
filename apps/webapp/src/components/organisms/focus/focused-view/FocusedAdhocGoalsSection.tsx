'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { FocusedGoalItem } from '@workspace/backend/convex/bff/focus';
import { ListTodo, Loader2 } from 'lucide-react';

import { FocusedGoalListItemFromGoal } from './FocusedGoalListItemFromGoal';
import { FocusedGoalSection } from './FocusedGoalSection';

interface FocusedAdhocGoalsSectionProps {
  goals: FocusedGoalItem[] | undefined;
  onToggleComplete: (goalId: FocusedGoalItem['_id'], isComplete: boolean) => void;
  initiativeTitleMap: Map<Id<'initiatives'>, string>;
  initiativeColorMap: Map<Id<'initiatives'>, string>;
}

export function FocusedAdhocGoalsSection({
  goals,
  onToggleComplete,
  initiativeTitleMap,
  initiativeColorMap,
}: FocusedAdhocGoalsSectionProps) {
  return (
    <FocusedGoalSection
      title="Tasks"
      icon={<ListTodo className="h-3.5 w-3.5 text-muted-foreground" />}
    >
      <div className="px-4 py-2">
        {goals === undefined ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : goals.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            No tasks for today. Add one below to capture a quick action.
          </p>
        ) : (
          <ul className="space-y-1">
            {goals.map((goal) => (
              <FocusedGoalListItemFromGoal
                key={goal._id}
                goal={goal}
                onToggleComplete={onToggleComplete}
                initiativeTitleMap={initiativeTitleMap}
                initiativeColorMap={initiativeColorMap}
              />
            ))}
          </ul>
        )}
      </div>
    </FocusedGoalSection>
  );
}
