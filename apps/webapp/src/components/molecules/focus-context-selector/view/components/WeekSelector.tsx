import type { ReactElement } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getWeeksInYear } from '@/lib/date/iso-week';

/**
 * Week selector component for weekly navigation.
 * Generates all weeks for the specified year.
 *
 * @example
 * ```tsx
 * <WeekSelector value={1} year={2025} onChange={(week) => handleWeekChange(week)} />
 * ```
 */
export interface WeekSelectorProps {
  /** Currently selected week */
  value: number;
  /** Year for which to generate weeks */
  year: number;
  /** Callback when week changes */
  onChange: (week: number) => void;
}

export function WeekSelector({ value, year, onChange }: WeekSelectorProps): ReactElement {
  const weeksInYear = getWeeksInYear(year);
  const weeks = Array.from({ length: weeksInYear }, (_, i) => i + 1);

  return (
    <Select value={value.toString()} onValueChange={(week) => onChange(parseInt(week, 10))}>
      <SelectTrigger className="w-[100px]">
        <SelectValue placeholder="Week" />
      </SelectTrigger>
      <SelectContent>
        <SelectScrollUpButton />
        {weeks.map((week) => (
          <SelectItem key={week} value={week.toString()}>
            W{week}
          </SelectItem>
        ))}
        <SelectScrollDownButton />
      </SelectContent>
    </Select>
  );
}
