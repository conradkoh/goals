import { useEffect, useState, type ReactElement } from 'react';

import { getFirstWeekOfQuarter } from '../utils';
import { QuarterSelector, WeekSelector, YearSelector } from '../view/components';
import { MainView } from '../view/MainView';

import { getQuarterFromWeek } from '@/lib/date/iso-week';

/**
 * Weekly context selector variant.
 * Allows users to select year, quarter, and week number with an explicit Apply button.
 * Quarter selection navigates to first week of that quarter.
 *
 * @example
 * ```tsx
 * <WeeklySelector
 *   open={isOpen}
 *   onOpenChange={setOpen}
 *   year={2025}
 *   quarter={1}
 *   week={1}
 *   onApply={(year, quarter, week) => handleSelect(year, quarter, week)}
 * />
 * ```
 */
export interface WeeklySelectorProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current year */
  year: number;
  /** Current quarter */
  quarter: 1 | 2 | 3 | 4;
  /** Current week */
  week: number;
  /** Callback when user applies selection (quarter is for navigation to first week of quarter) */
  onApply: (year: number, quarter: 1 | 2 | 3 | 4, week: number) => void;
}

export function WeeklySelector({
  open,
  onOpenChange,
  year,
  quarter,
  week,
  onApply,
}: WeeklySelectorProps): ReactElement {
  // Local state for pending changes
  const [pendingYear, setPendingYear] = useState(year);
  const [pendingQuarter, setPendingQuarter] = useState(quarter);
  const [pendingWeek, setPendingWeek] = useState(week);

  // Reset pending state when dialog opens or props change
  useEffect(() => {
    if (open) {
      setPendingYear(year);
      setPendingQuarter(quarter);
      setPendingWeek(week);
    }
  }, [open, year, quarter, week]);

  // Handle quarter change - navigates to first week of that quarter
  const handleQuarterChange = (newQuarter: 1 | 2 | 3 | 4) => {
    const firstWeek = getFirstWeekOfQuarter(newQuarter);
    setPendingQuarter(newQuarter);
    setPendingWeek(firstWeek);
  };

  // Handle week change - also update the quarter to match the week
  const handleWeekChange = (newWeek: number) => {
    const newQuarter = getQuarterFromWeek(newWeek);
    setPendingWeek(newWeek);
    setPendingQuarter(newQuarter);
  };

  const handleApply = () => {
    onApply(pendingYear, pendingQuarter, pendingWeek);
  };

  const handleCancel = () => {
    // Reset to original values
    setPendingYear(year);
    setPendingQuarter(quarter);
    setPendingWeek(week);
  };

  return (
    <MainView
      open={open}
      onOpenChange={onOpenChange}
      title="Select Week"
      description="Choose the year and week to view"
      onApply={handleApply}
      onCancel={handleCancel}
    >
      <YearSelector value={pendingYear} onChange={setPendingYear} />
      <QuarterSelector value={pendingQuarter} onChange={handleQuarterChange} />
      <WeekSelector value={pendingWeek} year={pendingYear} onChange={handleWeekChange} />
    </MainView>
  );
}
