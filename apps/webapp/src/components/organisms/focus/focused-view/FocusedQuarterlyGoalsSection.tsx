'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { FocusedGoalItem } from '@workspace/backend/convex/bff/focus';
import { Pin, Plus, Star, Target } from 'lucide-react';

import { FocusedGoalListItemFromGoal } from './FocusedGoalListItemFromGoal';
import { FocusedGoalSection } from './FocusedGoalSection';

interface FocusedQuarterlyGoalsSectionProps {
  goals: FocusedGoalItem[];
  onToggleComplete: (goalId: FocusedGoalItem['_id'], isComplete: boolean) => void;
  onAddGoal?: () => void;
  initiativeTitleMap: Map<Id<'initiatives'>, string>;
  initiativeColorMap: Map<Id<'initiatives'>, string>;
}

export function FocusedQuarterlyGoalsSection({
  goals,
  onToggleComplete,
  onAddGoal,
  initiativeTitleMap,
  initiativeColorMap,
}: FocusedQuarterlyGoalsSectionProps) {
  return (
    <FocusedGoalSection
      title="Quarterly Goals"
      description="Star or pin goals to keep them visible here."
      count={goals.length}
      icon={<Target className="h-3.5 w-3.5 text-muted-foreground" />}
      action={
        onAddGoal ? (
          <button
            type="button"
            onClick={onAddGoal}
            className="h-5 w-5 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center"
            aria-label="Add quarterly goal"
          >
            <Plus className="h-3 w-3" />
          </button>
        ) : undefined
      }
    >
      {goals.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          No quarterly goals for this week. Switch to Quarterly view to create or pin goals.
        </p>
      ) : (
        <div className="px-4 py-2">
          <ul className="space-y-1">
            {goals.map((goal) => {
              const indicator = goal.isStarred ? (
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-800 dark:text-yellow-400" />
              ) : goal.isPinned ? (
                <Pin className="h-3 w-3 fill-blue-500 text-blue-800 dark:text-blue-400" />
              ) : null;
              return (
                <FocusedGoalListItemFromGoal
                  key={goal._id}
                  goal={goal}
                  onToggleComplete={onToggleComplete}
                  initiativeTitleMap={initiativeTitleMap}
                  initiativeColorMap={initiativeColorMap}
                  isAdhoc={false}
                  leadingIndicator={indicator}
                />
              );
            })}
          </ul>
        </div>
      )}
    </FocusedGoalSection>
  );
}
