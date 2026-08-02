/**
 * @file Hook for managing sequential escape key handling in dialogs.
 * Provides a ref to track nested element state and a guard that prevents the
 * dialog from closing via Escape when a nested element is active.
 */

import { useCallback, useRef } from 'react';

export type DialogOpenChangeEventDetails = {
  reason?: string;
};

/**
 * Hook that provides escape key handling for dialogs with nested dismissible elements.
 * When a nested element is active (e.g., a form, popover, or expandable section),
 * pressing Escape will close the nested element first instead of closing the dialog.
 *
 * Base UI dialogs handle Escape at the Root's `onOpenChange(open, eventDetails)`
 * with `eventDetails.reason === 'escape-key'`. Wrap the Root's `onOpenChange`
 * with {@link createEscapeBlockingOpenChange} to prevent the close in that case.
 *
 * @public
 *
 * @example
 * ```tsx
 * const { handleNestedActiveChange, createEscapeBlockingOpenChange } =
 *   useDialogEscapeHandler();
 *
 * const handleOpenChange = createEscapeBlockingOpenChange(onOpenChange);
 *
 * return (
 *   <Dialog open={open} onOpenChange={handleOpenChange}>
 *     <DialogContent>
 *       <ExpandableForm onActiveChange={handleNestedActiveChange} />
 *     </DialogContent>
 *   </Dialog>
 * );
 * ```
 */
export function useDialogEscapeHandler() {
  // Use ref instead of state to avoid re-renders and ensure synchronous access
  const isNestedActiveRef = useRef(false);

  /**
   * Callback to track when a nested element becomes active/inactive.
   * Pass this to the nested element's onActiveChange or similar prop.
   */
  const handleNestedActiveChange = useCallback((isActive: boolean) => {
    isNestedActiveRef.current = isActive;
  }, []);

  /**
   * Returns true when a nested element is active and Escape should not close
   * the dialog. Pass to a dialog's escape-close guard predicate.
   */
  const shouldBlockEscapeClose = useCallback(() => isNestedActiveRef.current, []);

  /**
   * Wraps a Base UI Dialog `onOpenChange` so Escape closes are blocked while a
   * nested element is active. The wrapped callback receives `(open, eventDetails)`
   * where `eventDetails.reason` is the Base UI close reason (`'escape-key'`).
   */
  const createEscapeBlockingOpenChange = useCallback((onOpenChange?: (open: boolean) => void) => {
    return (open: boolean, eventDetails?: DialogOpenChangeEventDetails) => {
      if (!open && eventDetails?.reason === 'escape-key' && isNestedActiveRef.current) {
        return;
      }
      onOpenChange?.(open);
    };
  }, []);

  return {
    /** Ref tracking whether a nested element is currently active */
    isNestedActiveRef,
    /** Callback to pass to nested element's active state change handler */
    handleNestedActiveChange,
    /** Returns true when Escape should be blocked from closing the dialog */
    shouldBlockEscapeClose,
    /** Wraps a Base UI Dialog onOpenChange to block Escape close while nested element is active */
    createEscapeBlockingOpenChange,
  };
}
