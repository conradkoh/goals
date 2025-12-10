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
   * Callback for navigating to previous period
   */
  onPrevious?: () => void;
  /**
   * Callback for navigating to next period
   */
  onNext?: () => void;
  /**
   * Current year for quarter/year navigation
   */
  currentYear?: number;
  /**
   * Current quarter (1-4) for quarter/year navigation
   */
  currentQuarter?: number;
  /**
   * Callback to change year and quarter
   */
  onYearQuarterChange?: (year: number, quarter: number) => void;
}

export function ViewModeKeyboardShortcuts({
  onViewModeChange,
  enabled = true,
  onPrevious,
  onNext,
  currentYear,
  currentQuarter,
  onYearQuarterChange,
}: ViewModeKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if no element is focused (i.e., document.activeElement is body)
      if (document.activeElement !== document.body) return;

      // Handle arrow key navigation with modifiers
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const isLeft = e.key === 'ArrowLeft';
        const isMeta = e.metaKey || e.ctrlKey;
        const isShift = e.shiftKey;

        // Cmd/Ctrl + Shift + Arrow: Jump by year
        if (isMeta && isShift && currentYear && currentQuarter && onYearQuarterChange) {
          e.preventDefault();
          const newYear = isLeft ? currentYear - 1 : currentYear + 1;
          onYearQuarterChange(newYear, currentQuarter);
          return;
        }

        // Shift + Arrow: Jump by quarter
        if (isShift && !isMeta && currentYear && currentQuarter && onYearQuarterChange) {
          e.preventDefault();
          let newQuarter = isLeft ? currentQuarter - 1 : currentQuarter + 1;
          let newYear = currentYear;

          // Handle quarter overflow/underflow
          if (newQuarter < 1) {
            newQuarter = 4;
            newYear -= 1;
          } else if (newQuarter > 4) {
            newQuarter = 1;
            newYear += 1;
          }

          onYearQuarterChange(newYear, newQuarter);
          return;
        }

        // Plain Arrow: Navigate within current view (prev/next day/week)
        if (!isMeta && !isShift && !e.altKey) {
          e.preventDefault();
          if (isLeft && onPrevious) {
            onPrevious();
          } else if (!isLeft && onNext) {
            onNext();
          }
          return;
        }
      }

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
  }, [
    onViewModeChange,
    enabled,
    onPrevious,
    onNext,
    currentYear,
    currentQuarter,
    onYearQuarterChange,
  ]);

  return null;
}
