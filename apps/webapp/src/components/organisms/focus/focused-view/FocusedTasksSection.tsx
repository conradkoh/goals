'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { AdhocGoalWithChildren } from '@workspace/backend/convex/adhocGoal';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

import { FocusedTaskItem } from './FocusedTaskItem';
import { FocusedTaskSection } from './FocusedTaskSection';

interface FocusedTasksSectionProps {
  adhocGoals: AdhocGoalWithChildren[] | undefined;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  weekNumber: number;
  onToggleComplete: (goalId: Id<'goals'>, isComplete: boolean) => void;
}

interface FlattenedGoal {
  goal: AdhocGoalWithChildren;
  depth: number;
}

function flattenGoals(goals: AdhocGoalWithChildren[], depth = 0): FlattenedGoal[] {
  const result: FlattenedGoal[] = [];
  for (const goal of goals) {
    result.push({ goal, depth });
    if (goal.children && goal.children.length > 0) {
      result.push(...flattenGoals(goal.children, depth + 1));
    }
  }
  return result;
}

export function FocusedTasksSection({
  adhocGoals,
  year,
  quarter,
  weekNumber,
  onToggleComplete,
}: FocusedTasksSectionProps) {
  const flatGoals = useMemo(
    () => (adhocGoals ? flattenGoals(adhocGoals) : undefined),
    [adhocGoals]
  );

  return (
    <FocusedTaskSection title="Tasks">
      <div className="px-4 py-2">
        {flatGoals === undefined ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : flatGoals.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No tasks for today.</p>
        ) : (
          <ul className="space-y-1">
            {flatGoals.map(({ goal, depth }) => (
              <FocusedTaskItem
                key={goal._id}
                goalId={goal._id}
                title={goal.title}
                isComplete={goal.isComplete ?? false}
                isAdhoc={true}
                year={year}
                quarter={quarter}
                weekNumber={weekNumber}
                onToggleComplete={onToggleComplete}
                indentLevel={depth}
              />
            ))}
          </ul>
        )}
      </div>
    </FocusedTaskSection>
  );
}
