import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { Clock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { usePendingGoalStatus } from '@/contexts/GoalStatusContext';

/**
 * Props for the PendingStatusDialog component.
 */
export interface PendingStatusDialogProps {
  /** Unique identifier of the goal to manage pending status for */
  goalId: Id<'goals'>;
  /** Trigger element that opens the dialog when clicked (optional in controlled mode) */
  children?: React.ReactNode;
  /** Controlled open state (optional - uses internal state if not provided) */
  open?: boolean;
  /** Handler for open state changes (optional - uses internal state if not provided) */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Dialog component for managing a goal's pending status.
 * Allows users to set, update, or clear the pending status with an optional description.
 * Supports Cmd+Enter keyboard shortcut to save.
 *
 * Can be used in two modes:
 * 1. Trigger mode: Pass children as the trigger element
 * 2. Controlled mode: Pass open and onOpenChange props
 *
 * @example
 * ```tsx
 * // Trigger mode
 * <PendingStatusDialog goalId={goal._id}>
 *   <button>Mark as Pending</button>
 * </PendingStatusDialog>
 *
 * // Controlled mode
 * <PendingStatusDialog
 *   goalId={goal._id}
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 * />
 * ```
 */
export const PendingStatusDialog: React.FC<PendingStatusDialogProps> = ({
  goalId,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}) => {
  const { isPending, pendingDescription, setPendingStatus, clearPendingStatus } =
    usePendingGoalStatus(goalId);

  // Use controlled state if provided, otherwise use internal state
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;

  const [description, setDescription] = useState(pendingDescription || '');

  // Update description when pendingDescription changes
  useEffect(() => {
    if (isOpen) {
      setDescription(pendingDescription || '');
    }
  }, [isOpen, pendingDescription]);

  /** Saves the pending status with the current description */
  const handleSave = useCallback(async () => {
    setPendingStatus(description.trim());
    setIsOpen(false);
  }, [description, setPendingStatus, setIsOpen]);

  /** Clears the pending status and closes the dialog */
  const handleClear = useCallback(async () => {
    await clearPendingStatus();
    setDescription('');
    setIsOpen(false);
  }, [clearPendingStatus, setIsOpen]);

  /** Handles dialog open/close state changes */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
    },
    [setIsOpen]
  );

  // Handle keyboard shortcuts (Cmd+Enter to save)
  useEffect(() => {
    const _handleKeyDown = (event: KeyboardEvent) => {
      if (isOpen && event.metaKey && event.key === 'Enter') {
        event.preventDefault();
        handleSave();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', _handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', _handleKeyDown);
    };
  }, [isOpen, handleSave]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500 dark:text-orange-400" />
            {isPending ? 'Update Pending Status' : 'Mark as Pending'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="pending-description" className="text-sm font-medium">
              Pending Reason
            </label>
            <Textarea
              id="pending-description"
              placeholder="Explain why this goal is pending (e.g., waiting for John's approval, blocked by API issue, etc.)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex justify-between gap-2">
            <div>
              {isPending && (
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
                >
                  Clear Pending
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white"
              >
                {isPending ? 'Update' : 'Mark Pending'}
                <span className="ml-2 text-xs opacity-75">⌘↵</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
