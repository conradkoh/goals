import type { ReactElement } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Quarter selector component for quarterly navigation.
 *
 * @example
 * ```tsx
 * <QuarterSelector value={1} onChange={(quarter) => handleQuarterChange(quarter)} />
 * ```
 */
export interface QuarterSelectorProps {
  /** Currently selected quarter (1-4) */
  value: 1 | 2 | 3 | 4;
  /** Callback when quarter changes */
  onChange: (quarter: 1 | 2 | 3 | 4) => void;
}

const QUARTERS = [1, 2, 3, 4] as const;

export function QuarterSelector({ value, onChange }: QuarterSelectorProps): ReactElement {
  return (
    <Select
      value={value.toString()}
      onValueChange={(quarter) => onChange(Number.parseInt(quarter, 10) as 1 | 2 | 3 | 4)}
    >
      <SelectTrigger className="w-[100px]">
        <SelectValue placeholder="Quarter" />
      </SelectTrigger>
      <SelectContent>
        {QUARTERS.map((quarter) => (
          <SelectItem key={quarter} value={quarter.toString()}>
            Q{quarter}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
