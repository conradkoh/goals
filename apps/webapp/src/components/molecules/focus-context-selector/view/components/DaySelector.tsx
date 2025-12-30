import type { DayOfWeek } from '@workspace/backend/src/constants';
import { getDayNameShort } from '@workspace/backend/src/constants';
import type { ReactElement } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Day selector component for daily navigation.
 * Shows all days of the week with their short names.
 *
 * @example
 * ```tsx
 * <DaySelector value={1} onChange={(day) => handleDayChange(day)} />
 * ```
 */
export interface DaySelectorProps {
  /** Currently selected day (1-7, where 1 is Monday) */
  value: DayOfWeek;
  /** Callback when day changes */
  onChange: (day: DayOfWeek) => void;
}

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function DaySelector({ value, onChange }: DaySelectorProps): ReactElement {
  return (
    <Select
      value={value.toString()}
      onValueChange={(day) => onChange(Number.parseInt(day, 10) as DayOfWeek)}
    >
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Day" />
      </SelectTrigger>
      <SelectContent>
        {DAYS.map((day) => (
          <SelectItem key={day} value={day.toString()}>
            {getDayNameShort(day)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
