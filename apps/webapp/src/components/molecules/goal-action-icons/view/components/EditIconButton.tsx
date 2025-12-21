import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { Edit2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import type { GoalSaveHandler, GoalUpdatePendingHandler } from '@/models/goal-handlers';

export interface EditIconButtonProps {
  /** Goal title */
  title: string;
  /** Goal details */
  details?: string;
  /** Initial due date */
  initialDueDate?: number;
  /** Initial domain ID */
  initialDomainId?: Id<'domains'> | null;
  /** Whether to show domain selector in edit popover */
  showDomainSelector?: boolean;
  /** Handler for saving goal edits */
  onSave: GoalSaveHandler;
  /** Handler for tracking pending updates */
  onUpdatePending?: GoalUpdatePendingHandler;
  /** Custom trigger button (optional) */
  trigger?: ReactNode;
}

/**
 * Edit icon button component.
 * Renders an edit button that opens a GoalEditPopover.
 *
 * @example
 * ```tsx
 * <EditIconButton
 *   title={goal.title}
 *   details={goal.details}
 *   onSave={handleSave}
 * />
 * ```
 */
export function EditIconButton({
  title,
  details,
  initialDueDate,
  initialDomainId,
  showDomainSelector = false,
  onSave,
  onUpdatePending,
  trigger,
}: EditIconButtonProps) {
  return (
    <GoalEditPopover
      title={title}
      details={details}
      initialDueDate={initialDueDate}
      initialDomainId={initialDomainId}
      showDomainSelector={showDomainSelector}
      onSave={onSave}
      onUpdatePending={onUpdatePending}
      trigger={
        trigger || (
          <button
            type="button"
            className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-foreground focus:outline-none focus-visible:ring-0"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        )
      }
    />
  );
}
