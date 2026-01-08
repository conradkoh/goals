/**
 * @file Hook for managing sequential escape key handling in dialogs.
 * Provides a ref to track nested element state and an escape handler that
 * prevents dialog close when a nested element is active.
 */

import { useCallback, useRef } from 'react';

/**
 * Hook that provides escape key handling for dialogs with nested dismissible elements.
 * When a nested element is active (e.g., a form, popover, or expandable section),
 * pressing Escape will close the nested element first instead of closing the dialog.
 *
 * @public
 *
 * @example
 * ```tsx
 * const { handleEscapeKeyDown, handleNestedActiveChange } =
 *   useDialogEscapeHandler();
 *
 * return (
 *   <DialogContent onEscapeKeyDown={handleEscapeKeyDown}>
 *     <ExpandableForm onActiveChange={handleNestedActiveChange} />
 *   </DialogContent>
 * );
 * ```
 */
export function useDialogEscapeHandler() {
  // Use ref instead of state to avoid re-renders and ensure synchronous access
  const isNestedActiveRef = useRef(false);

  /**
   * Handles escape key - prevents dialog from closing if a nested element is active.
   * Call e.preventDefault() to stop the dialog from closing.
   */
  const handleEscapeKeyDown = useCallback((e: KeyboardEvent) => {
    if (isNestedActiveRef.current) {
      e.preventDefault();
    }
  }, []);

  /**
   * Callback to track when a nested element becomes active/inactive.
   * Pass this to the nested element's onActiveChange or similar prop.
   */
  const handleNestedActiveChange = useCallback((isActive: boolean) => {
    isNestedActiveRef.current = isActive;
  }, []);

  return {
    /** Ref tracking whether a nested element is currently active */
    isNestedActiveRef,
    /** Handler to pass to DialogContent's onEscapeKeyDown prop */
    handleEscapeKeyDown,
    /** Callback to pass to nested element's active state change handler */
    handleNestedActiveChange,
  };
}
