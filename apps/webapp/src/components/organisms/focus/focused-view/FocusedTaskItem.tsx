'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useState } from 'react';

import { StandaloneGoalPopover } from '@/components/molecules/goal-details-popover/variants/StandaloneGoalPopover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface FocusedTaskItemProps {
  goalId: Id<'goals'>;
  title: string;
  isComplete: boolean;
  isAdhoc: boolean;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  weekNumber?: number;
  onToggleComplete: (goalId: Id<'goals'>, isComplete: boolean) => void;
  incompleteClassName?: string;
  /** Nesting depth for visual indentation (0 = root) */
  indentLevel?: number;
}

export function FocusedTaskItem({
  goalId,
  title,
  isComplete,
  isAdhoc,
  year,
  quarter,
  weekNumber,
  onToggleComplete,
  incompleteClassName,
  indentLevel = 0,
}: FocusedTaskItemProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <>
      <li
        className="flex items-center gap-2 py-1"
        style={indentLevel > 0 ? { paddingLeft: `${indentLevel * 16}px` } : undefined}
      >
        <Checkbox
          checked={isComplete}
          onCheckedChange={(checked) => onToggleComplete(goalId, Boolean(checked))}
          className="flex-shrink-0"
        />
        <button
          type="button"
          onClick={() => setPopoverOpen(true)}
          className={cn(
            'text-sm text-left flex-1 truncate hover:text-foreground transition-colors',
            isComplete
              ? 'line-through text-muted-foreground'
              : (incompleteClassName ?? 'text-foreground')
          )}
        >
          {title}
        </button>
      </li>

      <StandaloneGoalPopover
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        goalId={popoverOpen ? goalId : null}
        goalType={isAdhoc ? 'adhoc' : 'quarterly'}
        year={year}
        quarter={quarter}
        weekNumber={weekNumber}
      />
    </>
  );
}
