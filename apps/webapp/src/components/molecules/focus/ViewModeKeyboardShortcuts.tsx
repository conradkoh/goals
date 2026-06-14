import { useEffect } from 'react';

import type { ViewMode } from '@/components/molecules/focus/constants';
import { isTypingTarget } from '@/lib/keyboard/isTypingTarget';

const VIEW_MODE_BY_KEY: Partial<Record<string, ViewMode>> = {
  d: 'daily',
  w: 'weekly',
  q: 'quarterly',
  f: 'focused',
};

function hasModifierKey(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;
}

// fallow-ignore-next-line complexity
function handleViewModeKeyDown(
  e: KeyboardEvent,
  onViewModeChange: (viewMode: ViewMode) => void,
  onOpenQuarterJump?: () => void
): void {
  const key = e.key.toLowerCase();

  if ((e.metaKey || e.ctrlKey) && key === 'k') {
    e.preventDefault();
    onOpenQuarterJump?.();
    return;
  }

  if (isTypingTarget(document.activeElement) || hasModifierKey(e)) {
    return;
  }

  const viewMode = VIEW_MODE_BY_KEY[key];
  if (!viewMode) {
    return;
  }

  e.preventDefault();
  onViewModeChange(viewMode);
}

/**
 * Props for the ViewModeKeyboardShortcuts component.
 */
export interface ViewModeKeyboardShortcutsProps {
  /** Callback fired when view mode should change */
  onViewModeChange: (viewMode: ViewMode) => void;
  /** Whether the keyboard shortcuts are enabled (default: true) */
  enabled?: boolean;
  /** Callback fired when Cmd+K is pressed to open quarter jump dialog */
  onOpenQuarterJump?: () => void;
}

/**
 * Invisible component that listens for keyboard shortcuts to change view modes.
 * Supports D (daily), W (weekly), Q (quarterly), F (focused), and Cmd+K (opens appropriate command dialog based on view).
 *
 * In quarterly view: Cmd+K opens quarter jump dialog
 * In weekly/daily view: Cmd+K opens goal search dialog (with option to jump to quarter)
 *
 * @example
 * ```tsx
 * <ViewModeKeyboardShortcuts
 *   onViewModeChange={setViewMode}
 *   onOpenQuarterJump={() => setQuarterJumpOpen(true)}
 * />
 * ```
 */
export function ViewModeKeyboardShortcuts({
  onViewModeChange,
  enabled = true,
  onOpenQuarterJump,
}: ViewModeKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      handleViewModeKeyDown(e, onViewModeChange, onOpenQuarterJump);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onViewModeChange, enabled, onOpenQuarterJump]);

  return null;
}
