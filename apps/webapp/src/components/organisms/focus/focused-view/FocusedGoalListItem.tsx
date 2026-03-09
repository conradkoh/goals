'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useState } from 'react';

import { StandaloneGoalModal } from '@/components/molecules/goal-details-popover/variants/StandaloneGoalModal';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface FocusedGoalListItemProps {
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

export function FocusedGoalListItem({
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
}: FocusedGoalListItemProps) {
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

      <StandaloneGoalModal
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        goalId={popoverOpen ? goalId : null}
        goalCategory={isAdhoc ? 'adhoc' : 'standard'}
        year={year}
        quarter={quarter}
        weekNumber={weekNumber}
      />
    </>
  );
}
