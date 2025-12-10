import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { Edit2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { DeleteGoalIconButton } from '@/components/organisms/DeleteGoalIconButton';
import { useGoalContext } from '@/contexts/GoalContext';
import { useDeviceScreenInfo } from '@/hooks/useDeviceScreenInfo';
import { cn } from '@/lib/utils';
import type { GoalSaveHandler, GoalUpdatePendingHandler } from '@/models/goal-handlers';

export interface GoalActionButtonsProps {
  /** Handler for saving goal edits */
  onSave: GoalSaveHandler;
  /** Handler for tracking pending updates */
  onUpdatePending?: GoalUpdatePendingHandler;
  /** Whether to show edit button */
  showEditButton?: boolean;
  /** Whether to show delete button */
  showDeleteButton?: boolean;
  /** Whether delete requires confirmation */
  deleteRequiresConfirmation?: boolean;
  /** Whether to show domain selector in edit popover */
  showDomainSelector?: boolean;
  /** Additional class names */
  className?: string;
  /** Additional buttons to render before edit/delete */
  prefixButtons?: ReactNode;
  /** Additional buttons to render after edit/delete */
  suffixButtons?: ReactNode;
}

/**
 * Container for goal action buttons (edit, delete).
 * Renders edit popover and delete button with configurable options.
 *
 * @example
 * ```tsx
 * <GoalActionButtons
 *   onSave={handleSave}
 *   onUpdatePending={setPendingUpdate}
 *   showEditButton
 *   showDeleteButton
 * />
 * ```
 */
export function GoalActionButtons({
  onSave,
  onUpdatePending,
  showEditButton = true,
  showDeleteButton = true,
  deleteRequiresConfirmation = false,
  showDomainSelector = false,
  className,
  prefixButtons,
  suffixButtons,
}: GoalActionButtonsProps) {
  const { goal } = useGoalContext();
  const { isTouchDevice } = useDeviceScreenInfo();

  // On touch devices, always show buttons (no hover state available)
  // On desktop, show on hover via group-hover/title
  const buttonVisibilityClass = isTouchDevice
    ? 'opacity-70'
    : 'opacity-0 group-hover/title:opacity-100';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {prefixButtons}
      {showEditButton && (
        <GoalEditPopover
          title={goal.title}
          details={goal.details}
          initialDueDate={goal.dueDate}
          initialDomainId={goal.domainId ?? null}
          showDomainSelector={showDomainSelector}
          onSave={onSave}
          onUpdatePending={onUpdatePending}
          trigger={
            <button
              type="button"
              className={cn(
                'text-muted-foreground transition-opacity hover:text-foreground focus:outline-none focus-visible:ring-0',
                buttonVisibilityClass
              )}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          }
        />
      )}
      {showDeleteButton && (
        <DeleteGoalIconButton
          goalId={goal._id as Id<'goals'>}
          requireConfirmation={deleteRequiresConfirmation}
          buttonClassName={buttonVisibilityClass}
        />
      )}
      {suffixButtons}
    </div>
  );
}
