import type { DayOfWeek } from '@workspace/backend/src/constants';
import { useEffect, useState, type ReactElement } from 'react';

import { getFirstWeekOfQuarter } from '../utils';
import { DaySelector, QuarterSelector, WeekSelector, YearSelector } from '../view/components';
import { MainView } from '../view/MainView';

import { getQuarterFromWeek } from '@/lib/date/iso-week';

/**
 * Daily context selector variant.
 * Allows users to select year, quarter, week and day with an explicit Apply button.
 * Quarter selection navigates to first week of that quarter.
 *
 * @example
 * ```tsx
 * <DailySelector
 *   open={isOpen}
 *   onOpenChange={setOpen}
 *   year={2025}
 *   quarter={1}
 *   week={1}
 *   day={1}
 *   onApply={(year, quarter, week, day) => handleSelect(year, quarter, week, day)}
 * />
 * ```
 */
export interface DailySelectorProps {
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
  /** Current day of week (1-7) */
  day: DayOfWeek;
  /** Callback when user applies selection (quarter is for navigation to first week of quarter) */
  onApply: (year: number, quarter: 1 | 2 | 3 | 4, week: number, day: DayOfWeek) => void;
}

export function DailySelector({
  open,
  onOpenChange,
  year,
  quarter,
  week,
  day,
  onApply,
}: DailySelectorProps): ReactElement {
  // Local state for pending changes
  const [pendingYear, setPendingYear] = useState(year);
  const [pendingQuarter, setPendingQuarter] = useState(quarter);
  const [pendingWeek, setPendingWeek] = useState(week);
  const [pendingDay, setPendingDay] = useState(day);

  // Reset pending state when dialog opens or props change
  useEffect(() => {
    if (open) {
      setPendingYear(year);
      setPendingQuarter(quarter);
      setPendingWeek(week);
      setPendingDay(day);
    }
  }, [open, year, quarter, week, day]);

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
    onApply(pendingYear, pendingQuarter, pendingWeek, pendingDay);
  };

  const handleCancel = () => {
    // Reset to original values
    setPendingYear(year);
    setPendingQuarter(quarter);
    setPendingWeek(week);
    setPendingDay(day);
  };

  return (
    <MainView
      open={open}
      onOpenChange={onOpenChange}
      title="Select Day"
      description="Choose the year, week, and day to view"
      onApply={handleApply}
      onCancel={handleCancel}
    >
      <YearSelector value={pendingYear} onChange={setPendingYear} />
      <QuarterSelector value={pendingQuarter} onChange={handleQuarterChange} />
      <WeekSelector value={pendingWeek} year={pendingYear} onChange={handleWeekChange} />
      <DaySelector value={pendingDay} onChange={setPendingDay} />
    </MainView>
  );
}
