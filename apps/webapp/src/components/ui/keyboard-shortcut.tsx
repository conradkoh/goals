import { useEffect } from 'react';

export interface KeyboardShortcutProps {
  /**
   * Callback when Escape is pressed and no dialogs/popovers are open
   */
  onEscPressed?: () => void;
  /**
   * Whether to check for open dialogs/popovers before triggering the escape callback
   * @default true
   */
  checkForOpenDialogs?: boolean;
  /**
   * Whether the keyboard shortcut is enabled
   * @default true
   */
  enabled?: boolean;
}

export function KeyboardShortcut({
  onEscPressed,
  checkForOpenDialogs = true,
  enabled = true,
}: KeyboardShortcutProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscPressed) {
        if (checkForOpenDialogs) {
          // Check if there are any open dialogs or popovers
          const openDialogs = document.querySelectorAll('[role="dialog"]');
          const openPopovers = document.querySelectorAll('[role="dialog"][data-state="open"]');

          // Only trigger callback if there are no open dialogs or popovers
          if (openDialogs.length === 0 && openPopovers.length === 0) {
            onEscPressed();
          }
        } else {
          onEscPressed();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscPressed, checkForOpenDialogs, enabled]);

  return null;
}
