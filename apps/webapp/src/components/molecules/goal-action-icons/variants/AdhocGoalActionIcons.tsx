import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { ReactNode } from 'react';

import {
  DeleteIconButton,
  EditIconButton,
  FireIconButton,
  PendingIconButton,
} from '../view/components';
import { GoalActionIconsView } from '../view/GoalActionIconsView';

import type { GoalSaveHandler, GoalUpdatePendingHandler } from '@/models/goal-handlers';

export interface AdhocGoalActionIconsProps {
  /** Goal ID for status tracking */
  goalId: Id<'goals'>;
  /** Whether to show loading spinner */
  showSpinner?: boolean;
  /** Goal title for edit popover */
  title?: string;
  /** Goal details for edit popover */
  details?: string;
  /** Initial due date for edit popover */
  initialDueDate?: number;
  /** Initial domain ID for edit popover */
  initialDomainId?: Id<'domains'> | null;
  /** Whether to show fire icon */
  showFire?: boolean;
  /** Whether to show pending icon */
  showPending?: boolean;
  /** Whether to show edit button */
  showEdit?: boolean;
  /** Whether to show delete button */
  showDelete?: boolean;
  /** Whether to show domain selector in edit popover */
  showDomainSelector?: boolean;
  /** Handler for saving goal edits */
  onSave?: GoalSaveHandler;
  /** Handler for tracking pending updates */
  onUpdatePending?: GoalUpdatePendingHandler;
  /** Handler for delete action */
  onDelete?: () => void;
  /** Custom edit trigger button */
  editTrigger?: ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Goal action icons variant for adhoc goals.
 * Displays Fire, Pending, Edit, and Delete icons in the standard order.
 *
 * This is the most common variant used in adhoc goal list items.
 *
 * @example
 * ```tsx
 * <AdhocGoalActionIcons
 *   goalId={goal._id}
 *   title={goal.title}
 *   details={goal.details}
 *   showFire
 *   showPending
 *   showEdit
 *   showDelete
 *   onSave={handleSave}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export function AdhocGoalActionIcons({
  goalId,
  showSpinner = false,
  title,
  details,
  initialDueDate,
  initialDomainId,
  showFire = true,
  showPending = true,
  showEdit = false,
  showDelete = false,
  showDomainSelector = true,
  onSave,
  onUpdatePending,
  onDelete,
  editTrigger,
  className,
}: AdhocGoalActionIconsProps) {
  return (
    <GoalActionIconsView className={className} showSpinner={showSpinner}>
      {!showSpinner && (
        <>
          {showFire && <FireIconButton goalId={goalId} />}
          {showPending && <PendingIconButton goalId={goalId} />}
          {showEdit && onSave && title !== undefined && (
            <EditIconButton
              title={title}
              details={details}
              initialDueDate={initialDueDate}
              initialDomainId={initialDomainId}
              showDomainSelector={showDomainSelector}
              onSave={onSave}
              onUpdatePending={onUpdatePending}
              trigger={editTrigger}
            />
          )}
          {showDelete && onDelete && <DeleteIconButton onDelete={onDelete} />}
        </>
      )}
    </GoalActionIconsView>
  );
}
