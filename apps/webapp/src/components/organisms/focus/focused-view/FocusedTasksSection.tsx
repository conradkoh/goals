'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { AdhocGoalWithChildren } from '@workspace/backend/convex/adhocGoal';
import { Loader2 } from 'lucide-react';

import { FocusedTaskItem } from './FocusedTaskItem';
import { FocusedTaskSection } from './FocusedTaskSection';

interface FocusedTasksSectionProps {
  adhocGoals: AdhocGoalWithChildren[] | undefined;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  weekNumber: number;
  onToggleComplete: (goalId: Id<'goals'>, isComplete: boolean) => void;
}

export function FocusedTasksSection({
  adhocGoals,
  year,
  quarter,
  weekNumber,
  onToggleComplete,
}: FocusedTasksSectionProps) {
  return (
    <FocusedTaskSection title="Tasks">
      <div className="px-4 py-2">
        {adhocGoals === undefined ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : adhocGoals.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No tasks for today.</p>
        ) : (
          <ul className="space-y-1">
            {adhocGoals.map((goal) => (
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
              />
            ))}
          </ul>
        )}
      </div>
    </FocusedTaskSection>
  );
}
