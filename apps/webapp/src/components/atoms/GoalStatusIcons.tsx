import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { Archive, ArrowUp } from 'lucide-react';

import { FireIcon } from '@/components/atoms/FireIcon';
import { PendingIcon } from '@/components/atoms/PendingIcon';
import { DeleteGoalIconButton } from '@/components/organisms/DeleteGoalIconButton';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface GoalStatusIconsProps {
  /** Goal ID for status tracking */
  goalId: Id<'goals'>;
  /** Additional class names */
  className?: string;
  /** Whether to show the delete button */
  showDelete?: boolean;
  /** Whether to show backlog toggle (for adhoc goals) */
  showBacklog?: boolean;
  /** Current backlog status */
  isBacklog?: boolean;
  /** Handler for toggling backlog status */
  onToggleBacklog?: (isBacklog: boolean) => void;
}

/**
 * Displays Fire (urgent), Pending status, Backlog toggle, and Delete icons for a goal.
 * Used in goal detail popovers/modals to show and toggle status.
 *
 * Icons are always visible in this context (not hover-based like in list view).
 * Icons are sized larger for better touch accessibility.
 *
 * @example
 * ```tsx
 * <GoalStatusIcons goalId={goal._id} showDelete />
 *
 * // With backlog toggle for adhoc goals
 * <GoalStatusIcons
 *   goalId={goal._id}
 *   showBacklog
 *   isBacklog={goal.isBacklog}
 *   onToggleBacklog={handleToggleBacklog}
 * />
 * ```
 */
export function GoalStatusIcons({
  goalId,
  className,
  showDelete = true,
  showBacklog = false,
  isBacklog = false,
  onToggleBacklog,
}: GoalStatusIconsProps) {
  const BacklogIcon = isBacklog ? ArrowUp : Archive;
  const backlogTooltip = isBacklog ? 'Move to Active' : 'Move to Backlog';

  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        {/* Make icons larger and add padding for better touch targets */}
        <FireIcon
          goalId={goalId}
          className="opacity-100 [&_svg]:h-5 [&_svg]:w-5 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
        />
        <PendingIcon
          goalId={goalId}
          className="opacity-100 [&_svg]:h-5 [&_svg]:w-5 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
        />
        {showBacklog && onToggleBacklog && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-100 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  onClick={() => onToggleBacklog(!isBacklog)}
                >
                  <BacklogIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {backlogTooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {showDelete && (
          // Override the opacity-0 group-hover styling from DeleteGoalIconButton
          // In popover context, we want the delete button always visible
          // Make icon larger and add padding for better touch targets
          <div className="[&_button]:opacity-100 [&_button]:hover:opacity-100 [&_button]:p-1 [&_button]:min-w-[32px] [&_button]:min-h-[32px] [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_svg]:h-5 [&_svg]:w-5">
            <DeleteGoalIconButton goalId={goalId} requireConfirmation />
          </div>
        )}
      </div>
    </div>
  );
}
