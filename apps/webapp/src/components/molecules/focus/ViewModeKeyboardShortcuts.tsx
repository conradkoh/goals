import { useEffect } from 'react';
import type { ViewMode } from '@/components/molecules/focus/constants';

interface ViewModeKeyboardShortcutsProps {
  onViewModeChange: (viewMode: ViewMode) => void;
  /**
   * Whether the keyboard shortcuts are enabled
   * @default true
   */
  enabled?: boolean;
}

export function ViewModeKeyboardShortcuts({
  onViewModeChange,
  enabled = true,
}: ViewModeKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if no element is focused (i.e., document.activeElement is body)
      if (document.activeElement !== document.body) return;

      // Don't trigger if modifier keys are pressed
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      switch (e.key.toLowerCase()) {
        case 'd':
          e.preventDefault();
          onViewModeChange('daily');
          break;
        case 'w':
          e.preventDefault();
          onViewModeChange('weekly');
          break;
        case 'q':
          e.preventDefault();
          onViewModeChange('quarterly');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onViewModeChange, enabled]);

  return null;
}
