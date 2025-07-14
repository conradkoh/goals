import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

/**
 * Custom hook for clipboard operations with toast notifications.
 * Provides a simple interface to copy text to clipboard with user feedback.
 */
export function useClipboard() {
  const [isCopying, setIsCopying] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = useCallback(async (text: string, successMessage?: string) => {
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
      
      toast({
        title: 'Copied to clipboard',
        description: successMessage || 'Content has been copied to your clipboard.',
      });
      
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: 'Copy failed',
        description: 'Failed to copy content to clipboard. Please try again.',
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setIsCopying(false);
    }
  }, [isCopying, toast]);

  return {
    copyToClipboard,
    isCopying,
  };
} 