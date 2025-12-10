import { useEffect } from 'react';
import type { ViewMode } from '@/components/molecules/focus/constants';

interface ViewModeKeyboardShortcutsProps {
  onViewModeChange: (viewMode: ViewMode) => void;
  /**
   * Whether the keyboard shortcuts are enabled
   * @default true
   */
  enabled?: boolean;
  /**
   * Callback when Cmd+K is pressed to open quarter jump dialog
   */
  onOpenQuarterJump?: () => void;
}

export function ViewModeKeyboardShortcuts({
  onViewModeChange,
  enabled = true,
  onOpenQuarterJump,
}: ViewModeKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Open quarter jump dialog
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenQuarterJump?.();
        return;
      }

      // Only trigger view mode shortcuts if no element is focused
      if (document.activeElement !== document.body) return;

      // Don't trigger view mode shortcuts if modifier keys are pressed
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      // View mode shortcuts
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
  }, [onViewModeChange, enabled, onOpenQuarterJump]);

  return null;
}
