import { useCallback, useState } from 'react';

/**
 * Custom hook for clipboard operations.
 * Provides a simple interface to copy text to clipboard.
 */
export function useClipboard() {
  const [isCopying, setIsCopying] = useState(false);

  const copyToClipboard = useCallback(
    async (text: string, _successMessage?: string) => {
      if (isCopying) return false;

      setIsCopying(true);

      try {
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);

          if (!successful) {
            throw new Error('Failed to copy text');
          }
        }

        return true;
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
      } finally {
        setIsCopying(false);
      }
    },
    [isCopying]
  );

  return {
    copyToClipboard,
    isCopying,
  };
}
