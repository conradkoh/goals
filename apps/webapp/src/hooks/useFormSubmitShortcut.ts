import { useCallback } from 'react';

interface UseFormSubmitShortcutProps {
  onSubmit: () => void;
  shouldPreventDefault?: boolean;
  /** When true, the shortcut is ignored (e.g. while submitting or form invalid) */
  disabled?: boolean;
}

/**
 * A hook that handles form submission via Cmd/Ctrl + Enter
 * @param onSubmit Function to call when the shortcut is triggered
 * @param shouldPreventDefault Whether to prevent the default event behavior (defaults to true)
 * @param disabled When true, the shortcut is ignored
 * @returns A callback to handle keydown events
 */
export const useFormSubmitShortcut = ({
  onSubmit,
  shouldPreventDefault = true,
  disabled = false,
}: UseFormSubmitShortcutProps) => {
  return useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      // Handle Cmd/Ctrl + Enter
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        if (shouldPreventDefault) {
          e.preventDefault();
          e.stopPropagation();
        }
        onSubmit();
      }
    },
    [onSubmit, shouldPreventDefault, disabled]
  );
};
