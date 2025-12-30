import type { ReactElement } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Year selector component for quarterly navigation.
 * Generates a range of years centered around the current selection.
 *
 * @example
 * ```tsx
 * <YearSelector value={2025} onChange={(year) => handleYearChange(year)} />
 * ```
 */
export interface YearSelectorProps {
  /** Currently selected year */
  value: number;
  /** Callback when year changes */
  onChange: (year: number) => void;
  /** Number of years to show before and after the current year */
  range?: number;
}

export function YearSelector({ value, onChange, range = 2 }: YearSelectorProps): ReactElement {
  const years = Array.from({ length: range * 2 + 1 }, (_, i) => value - range + i);

  return (
    <Select value={value.toString()} onValueChange={(year) => onChange(Number.parseInt(year, 10))}>
      <SelectTrigger className="w-[100px]">
        <SelectValue placeholder="Year" />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
