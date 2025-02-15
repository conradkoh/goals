import { useCallback } from 'react';

interface UseFormSubmitShortcutProps {
  onSubmit: () => void;
  shouldPreventDefault?: boolean;
}

/**
 * A hook that handles form submission via Cmd/Ctrl + Enter
 * @param onSubmit Function to call when the shortcut is triggered
 * @param shouldPreventDefault Whether to prevent the default event behavior (defaults to true)
 * @returns A callback to handle keydown events
 */
export const useFormSubmitShortcut = ({
  onSubmit,
  shouldPreventDefault = true,
}: UseFormSubmitShortcutProps) => {
  return useCallback(
    (e: React.KeyboardEvent) => {
      // Handle Cmd/Ctrl + Enter
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        if (shouldPreventDefault) {
          e.preventDefault();
          e.stopPropagation();
        }
        onSubmit();
      }
    },
    [onSubmit, shouldPreventDefault]
  );
};
