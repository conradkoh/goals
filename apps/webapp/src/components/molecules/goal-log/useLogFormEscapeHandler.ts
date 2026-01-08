/**
 * @file Hook for managing escape key handling in dialogs with log forms.
 * Provides a ref to track form state and an escape handler that prevents
 * dialog close when a form is active.
 */

import { useCallback, useRef } from 'react';

/**
 * Hook that provides escape key handling for dialogs containing log forms.
 * When a log form is active (creating or editing), pressing Escape will
 * close the form first instead of closing the entire dialog.
 *
 * @example
 * ```tsx
 * const { isLogFormActiveRef, handleEscapeKeyDown, handleLogFormActiveChange } =
 *   useLogFormEscapeHandler();
 *
 * return (
 *   <DialogContent onEscapeKeyDown={handleEscapeKeyDown}>
 *     <GoalLogTab onFormActiveChange={handleLogFormActiveChange} />
 *   </DialogContent>
 * );
 * ```
 */
export function useLogFormEscapeHandler() {
  // Use ref instead of state to avoid re-renders and ensure synchronous access
  const isLogFormActiveRef = useRef(false);

  /**
   * Handles escape key - prevents dialog from closing if a log form is active.
   * Call e.preventDefault() to stop the dialog from closing.
   */
  const handleEscapeKeyDown = useCallback((e: KeyboardEvent) => {
    if (isLogFormActiveRef.current) {
      e.preventDefault();
    }
  }, []);

  /**
   * Callback to track when a log form becomes active/inactive.
   * Pass this to GoalLogTab's onFormActiveChange prop.
   */
  const handleLogFormActiveChange = useCallback((isActive: boolean) => {
    isLogFormActiveRef.current = isActive;
  }, []);

  return {
    isLogFormActiveRef,
    handleEscapeKeyDown,
    handleLogFormActiveChange,
  };
}
