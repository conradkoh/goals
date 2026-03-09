'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';

import { FocusedTaskItem } from './FocusedTaskItem';
import { FocusedTaskSection } from './FocusedTaskSection';

interface FocusedUrgentSectionProps {
  year: number;
  quarter: number;
  weekNumber: number;
  dayOfWeek: number;
}

export function FocusedUrgentSection({
  year,
  quarter,
  weekNumber,
  dayOfWeek,
}: FocusedUrgentSectionProps) {
  const urgentGoals = useSessionQuery(api.fireGoal.getFireGoalDetails, {
    year,
    quarter,
    weekNumber,
    dayOfWeek,
  });
  const toggleCompletion = useSessionMutation(api.dashboard.toggleGoalCompletion);

  if (!urgentGoals || urgentGoals.length === 0) return null;

  const incompleteCount = urgentGoals.filter((g) => !g.isComplete).length;

  const handleToggle = async (goalId: (typeof urgentGoals)[number]['_id'], isComplete: boolean) => {
    const goal = urgentGoals.find((g) => g._id === goalId);
    if (!goal) return;
    await toggleCompletion({
      goalId: goal._id,
      weekNumber: goal.weekNumber ?? 1,
      isComplete,
    });
  };

  return (
    <FocusedTaskSection
      title="Urgent"
      count={incompleteCount}
      countColorClass="text-red-400"
      countDotColorClass="bg-red-400"
    >
      <div className="px-4 py-2">
        <ul className="space-y-1">
          {urgentGoals.map((goal) => (
            <FocusedTaskItem
              key={goal._id}
              goalId={goal._id}
              title={goal.title}
              isComplete={goal.isComplete}
              isAdhoc={goal.isAdhoc}
              year={goal.year}
              quarter={goal.quarter as 1 | 2 | 3 | 4}
              weekNumber={goal.weekNumber ?? undefined}
              onToggleComplete={handleToggle}
              incompleteClassName="text-red-500 dark:text-red-400"
            />
          ))}
        </ul>
      </div>
    </FocusedTaskSection>
  );
}
