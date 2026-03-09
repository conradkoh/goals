'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useMemo } from 'react';

import { FocusedTaskItem } from './FocusedTaskItem';
import { FocusedTaskSection } from './FocusedTaskSection';

import { useWeek } from '@/hooks/useWeek';
import type { DayOfWeek } from '@/lib/constants';

interface FocusedDailyGoalsSectionProps {
  dayOfWeek: DayOfWeek;
}

export function FocusedDailyGoalsSection({ dayOfWeek }: FocusedDailyGoalsSectionProps) {
  const { dailyGoals, weekNumber, year, quarter, toggleGoalCompletion } = useWeek();

  const todaysDailyGoals = useMemo(
    () => dailyGoals.filter((g) => g.state?.daily?.dayOfWeek === dayOfWeek),
    [dailyGoals, dayOfWeek]
  );

  const handleToggle = async (goalId: Id<'goals'>, isComplete: boolean) => {
    await toggleGoalCompletion({
      goalId,
      weekNumber,
      isComplete,
    });
  };

  if (todaysDailyGoals.length === 0) return null;

  const incompleteCount = todaysDailyGoals.filter((g) => !g.isComplete).length;

  return (
    <FocusedTaskSection title="Daily Goals" count={incompleteCount}>
      <div className="px-4 py-2">
        <ul className="space-y-1">
          {todaysDailyGoals.map((goal) => (
            <FocusedTaskItem
              key={goal._id}
              goalId={goal._id}
              title={goal.title}
              isComplete={goal.isComplete}
              isAdhoc={false}
              year={year}
              quarter={quarter as 1 | 2 | 3 | 4}
              weekNumber={weekNumber}
              onToggleComplete={handleToggle}
            />
          ))}
        </ul>
      </div>
    </FocusedTaskSection>
  );
}
