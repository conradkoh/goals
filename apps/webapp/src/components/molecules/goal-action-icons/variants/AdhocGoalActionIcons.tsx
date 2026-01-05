import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { ReactNode } from 'react';

import {
  BacklogIconButton,
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
  /** Whether the goal is completed (used to hide backlog button for completed goals) */
  isComplete?: boolean;
  /** Whether the goal is in backlog */
  isBacklog?: boolean;
  /** Whether to show fire icon */
  showFire?: boolean;
  /** Whether to show pending icon */
  showPending?: boolean;
  /** Whether to show backlog icon */
  showBacklog?: boolean;
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
  /** Handler for toggling backlog status */
  onToggleBacklog?: (isBacklog: boolean) => void;
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
  isComplete = false,
  isBacklog = false,
  showFire = true,
  showPending = true,
  showBacklog = true,
  showEdit = false,
  showDelete = false,
  showDomainSelector = true,
  onSave,
  onUpdatePending,
  onToggleBacklog,
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
          {/* Only show backlog button for incomplete goals */}
          {showBacklog && !isComplete && onToggleBacklog && (
            <BacklogIconButton isBacklog={isBacklog} onToggleBacklog={onToggleBacklog} />
          )}
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
