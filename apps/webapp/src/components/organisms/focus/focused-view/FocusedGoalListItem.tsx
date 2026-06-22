'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useState } from 'react';

import { FireIconButton } from '@/components/molecules/goal-action-icons';
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
  leadingIndicator?: React.ReactNode;
  /** Show urgent toggle on hover (always visible when already urgent). */
  showFireToggle?: boolean;
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
  leadingIndicator,
  showFireToggle = true,
}: FocusedGoalListItemProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <>
      <li
        className={cn(
          'group/goal-item flex items-center gap-2 rounded-sm py-1 transition-colors hover:bg-accent/50',
          isComplete && 'opacity-60'
        )}
        style={indentLevel > 0 ? { paddingLeft: `${indentLevel * 16}px` } : undefined}
      >
        <Checkbox
          checked={isComplete}
          onCheckedChange={(checked) => onToggleComplete(goalId, Boolean(checked))}
          className="flex-shrink-0"
        />
        {leadingIndicator && <span className="flex-shrink-0">{leadingIndicator}</span>}
        <button
          type="button"
          onClick={() => setPopoverOpen(true)}
          className={cn(
            'min-w-0 flex-1 truncate text-left text-sm transition-all duration-200',
            isComplete
              ? 'text-muted-foreground/60 line-through'
              : (incompleteClassName ?? 'text-foreground')
          )}
        >
          {title}
        </button>
        {showFireToggle && <FireIconButton goalId={goalId} />}
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
