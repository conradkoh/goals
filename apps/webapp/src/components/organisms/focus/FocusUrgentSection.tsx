'use client';

/**
 * FocusUrgentSection
 *
 * Displays on-fire goals as a flat, distraction-free list inside the focused view.
 * Each row has a checkbox (toggling completion) and a title button (opens detail panel).
 * Renders nothing if there are no on-fire goals.
 *
 * @module FocusUrgentSection
 */

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { useState } from 'react';

import { StandaloneGoalPopover } from '@/components/molecules/goal-details-popover/variants/StandaloneGoalPopover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export function FocusUrgentSection() {
  const urgentGoals = useSessionQuery(api.fireGoal.getFireGoalDetails, {});
  const toggleCompletion = useSessionMutation(api.dashboard.toggleGoalCompletion);

  const [selectedGoalId, setSelectedGoalId] = useState<Id<'goals'> | null>(null);
  const [selectedGoalType, setSelectedGoalType] = useState<'quarterly' | 'adhoc'>('quarterly');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(1);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | undefined>(undefined);

  if (!urgentGoals || urgentGoals.length === 0) return null;

  const incompleteCount = urgentGoals.filter((g) => !g.isComplete).length;

  const handleToggle = async (goal: (typeof urgentGoals)[number], checked: boolean) => {
    await toggleCompletion({
      goalId: goal._id,
      weekNumber: goal.weekNumber ?? 1,
      isComplete: checked,
    });
  };

  const handleGoalClick = (goal: (typeof urgentGoals)[number]) => {
    setSelectedGoalId(goal._id);
    setSelectedGoalType(goal.isAdhoc ? 'adhoc' : 'quarterly');
    setSelectedYear(goal.year);
    setSelectedQuarter(goal.quarter as 1 | 2 | 3 | 4);
    setSelectedWeekNumber(goal.weekNumber ?? undefined);
  };

  return (
    <>
      {/* Industrial header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Urgent</h3>
        {incompleteCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-red-400" />
            <span className="text-[10px] font-bold text-red-400 tabular-nums">
              {incompleteCount}
            </span>
          </span>
        )}
      </div>

      {/* Flat goal list */}
      <div className="px-4 py-2">
        <ul className="space-y-1">
          {urgentGoals.map((goal) => (
            <li key={goal._id} className="flex items-center gap-2 py-1">
              <Checkbox
                checked={goal.isComplete}
                onCheckedChange={(checked) => handleToggle(goal, Boolean(checked))}
                className="flex-shrink-0"
              />
              <button
                type="button"
                onClick={() => handleGoalClick(goal)}
                className={cn(
                  'text-sm text-left flex-1 truncate hover:text-foreground transition-colors',
                  goal.isComplete ? 'line-through text-muted-foreground' : 'text-foreground'
                )}
              >
                {goal.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Goal detail panel */}
      <StandaloneGoalPopover
        open={selectedGoalId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedGoalId(null);
        }}
        goalId={selectedGoalId}
        goalType={selectedGoalType}
        year={selectedYear}
        quarter={selectedQuarter}
        weekNumber={selectedWeekNumber}
      />
    </>
  );
}
