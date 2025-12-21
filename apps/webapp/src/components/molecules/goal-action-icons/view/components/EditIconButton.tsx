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
  /** Group name for hover interactions (defaults to 'title') */
  groupName?: string;
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
  groupName = 'title',
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
            className={`text-muted-foreground opacity-0 group-hover/${groupName}:opacity-100 pointer-events-none group-hover/${groupName}:pointer-events-auto transition-opacity hover:text-foreground focus:outline-none focus-visible:ring-0`}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        )
      }
    />
  );
}
