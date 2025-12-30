import { useEffect, useState, type ReactElement } from 'react';

import { QuarterSelector, YearSelector } from '../view/components';
import { MainView } from '../view/MainView';

/**
 * Quarterly context selector variant.
 * Allows users to select year and quarter with an explicit Apply button.
 *
 * @example
 * ```tsx
 * <QuarterlySelector
 *   open={isOpen}
 *   onOpenChange={setOpen}
 *   year={2025}
 *   quarter={1}
 *   onApply={(year, quarter) => handleSelect(year, quarter)}
 * />
 * ```
 */
export interface QuarterlySelectorProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current year */
  year: number;
  /** Current quarter (1-4) */
  quarter: 1 | 2 | 3 | 4;
  /** Callback when user applies selection */
  onApply: (year: number, quarter: 1 | 2 | 3 | 4) => void;
}

export function QuarterlySelector({
  open,
  onOpenChange,
  year,
  quarter,
  onApply,
}: QuarterlySelectorProps): ReactElement {
  // Local state for pending changes
  const [pendingYear, setPendingYear] = useState(year);
  const [pendingQuarter, setPendingQuarter] = useState(quarter);

  // Reset pending state when dialog opens or props change
  useEffect(() => {
    if (open) {
      setPendingYear(year);
      setPendingQuarter(quarter);
    }
  }, [open, year, quarter]);

  const handleApply = () => {
    onApply(pendingYear, pendingQuarter);
  };

  const handleCancel = () => {
    // Reset to original values
    setPendingYear(year);
    setPendingQuarter(quarter);
  };

  return (
    <MainView
      open={open}
      onOpenChange={onOpenChange}
      title="Select Quarter"
      description="Choose the year and quarter to view"
      onApply={handleApply}
      onCancel={handleCancel}
    >
      <YearSelector value={pendingYear} onChange={setPendingYear} />
      <QuarterSelector value={pendingQuarter} onChange={setPendingQuarter} />
    </MainView>
  );
}
