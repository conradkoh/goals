import { useEffect } from 'react';

/**
 * Helper function to detect if the current device is an iPhone
 */
function isIphone(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone/i.test(navigator.userAgent);
}

/**
 * Hook to allow touch selection (text caret dragging) in dialogs on iOS.
 *
 * This is a workaround for react-remove-scroll blocking touch events that are
 * needed for text selection handles on iOS devices.
 *
 * @see https://github.com/theKashey/react-remove-scroll/pull/144#issuecomment-3289694594
 * @see https://github.com/shadcn-ui/ui/issues/5919
 */
export function useAllowTouchSelection() {
  useEffect(() => {
    // Only apply this workaround for iPhone devices
    if (!isIphone()) {
      return;
    }

    const nonPassive = { passive: false };

    const checkTouchingSelection = (event: TouchEvent) => {
      // If there's an active text selection, stop react-remove-scroll listeners
      // from blocking the touch event (which would prevent dragging the caret)
      if (document.getSelection()?.anchorNode) {
        event.stopImmediatePropagation();
        return;
      }
      // Let other listeners execute as usual
    };

    document.addEventListener('touchmove', checkTouchingSelection, nonPassive);

    return () => {
      document.removeEventListener(
        'touchmove',
        checkTouchingSelection,
        nonPassive as EventListenerOptions
      );
    };
  }, []);
}
