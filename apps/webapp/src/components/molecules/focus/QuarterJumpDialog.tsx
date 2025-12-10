import { Calendar, Clock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';

/**
 * Props for the QuarterJumpDialog component.
 */
export interface QuarterJumpDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Selected year (the year user is currently viewing) */
  selectedYear: number;
  /** Selected quarter (the quarter user is currently viewing, 1-4) */
  selectedQuarter: number;
  /** Callback when a quarter is selected */
  onQuarterSelect: (year: number, quarter: number) => void;
}

/**
 * Internal type representing a quarter option in the selection list.
 */
interface _QuarterOption {
  /** Display label for the quarter (e.g., "Q1 2024") */
  label: string;
  /** Year of the quarter */
  year: number;
  /** Quarter number (1-4) */
  quarter: number;
  /** Whether this quarter is currently selected/viewing */
  isSelected: boolean;
}

/**
 * Dialog for quickly jumping to a specific quarter.
 * Opened via Cmd+K keyboard shortcut.
 * Shows recent quarters and allows custom year/quarter input.
 */
export function QuarterJumpDialog({
  open,
  onOpenChange,
  selectedYear,
  selectedQuarter,
  onQuarterSelect,
}: QuarterJumpDialogProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customYear, setCustomYear] = useState(selectedYear.toString());
  const [customQuarter, setCustomQuarter] = useState(selectedQuarter.toString());

  // Get actual current year and quarter (not selected, but actual current date)
  const actualCurrentYear = useMemo(() => new Date().getFullYear(), []);
  const actualCurrentQuarter = useMemo(
    () => Math.ceil((new Date().getMonth() + 1) / 3) as 1 | 2 | 3 | 4,
    []
  );

  // Check if user is viewing the actual current quarter
  const isViewingCurrentQuarter =
    selectedYear === actualCurrentYear && selectedQuarter === actualCurrentQuarter;

  // Reset custom input state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowCustomInput(false);
      setCustomYear(selectedYear.toString());
      setCustomQuarter(selectedQuarter.toString());
    }
  }, [open, selectedYear, selectedQuarter]);

  // Generate quarter options (actual current year -1 to +1, all quarters)
  const quarterOptions = useMemo((): _QuarterOption[] => {
    const options: _QuarterOption[] = [];
    const years = [actualCurrentYear - 1, actualCurrentYear, actualCurrentYear + 1];

    for (const year of years) {
      for (const quarter of [1, 2, 3, 4]) {
        options.push({
          label: `Q${quarter} ${year}`,
          year,
          quarter,
          isSelected: year === selectedYear && quarter === selectedQuarter,
        });
      }
    }

    return options;
  }, [actualCurrentYear, selectedYear, selectedQuarter]);

  const handleSelect = useCallback(
    (year: number, quarter: number) => {
      onQuarterSelect(year, quarter);
      onOpenChange(false);
    },
    [onQuarterSelect, onOpenChange]
  );

  const handleCustomSubmit = useCallback(() => {
    const year = Number.parseInt(customYear, 10);
    const quarter = Number.parseInt(customQuarter, 10);

    if (!Number.isNaN(year) && quarter >= 1 && quarter <= 4) {
      handleSelect(year, quarter);
    }
  }, [customYear, customQuarter, handleSelect]);

  const handleSelectCurrent = useCallback(() => {
    handleSelect(actualCurrentYear, actualCurrentQuarter);
  }, [handleSelect, actualCurrentYear, actualCurrentQuarter]);

  const handleShowCustomInput = useCallback(() => {
    setShowCustomInput(true);
  }, []);

  const handleHideCustomInput = useCallback(() => {
    setShowCustomInput(false);
  }, []);

  const handleYearChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomYear(e.target.value);
  }, []);

  const handleQuarterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomQuarter(e.target.value);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to quarter... (e.g. Q1 2024)" />
      <CommandList>
        <CommandEmpty>No quarter found.</CommandEmpty>

        {!showCustomInput && (
          <>
            {!isViewingCurrentQuarter && (
              <CommandGroup heading="Jump to Current">
                <CommandItem
                  value={`Q${actualCurrentQuarter} ${actualCurrentYear} current`}
                  onSelect={handleSelectCurrent}
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  <span>
                    Q{actualCurrentQuarter} {actualCurrentYear}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">(current)</span>
                </CommandItem>
              </CommandGroup>
            )}

            <CommandGroup heading="Quick Jump">
              {quarterOptions.map((option) => (
                <CommandItem
                  key={`${option.year}-${option.quarter}`}
                  value={option.label}
                  onSelect={() => handleSelect(option.year, option.quarter)}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  <span>{option.label}</span>
                  {option.isSelected && (
                    <span className="ml-auto text-xs text-muted-foreground">(viewing)</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Other">
              <CommandItem onSelect={handleShowCustomInput} className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Custom quarter...</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {showCustomInput && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label htmlFor="custom-year" className="text-sm font-medium text-muted-foreground">
                  Year
                </label>
                <Input
                  id="custom-year"
                  type="number"
                  value={customYear}
                  onChange={handleYearChange}
                  placeholder="2024"
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="custom-quarter"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Quarter
                </label>
                <Input
                  id="custom-quarter"
                  type="number"
                  min={1}
                  max={4}
                  value={customQuarter}
                  onChange={handleQuarterChange}
                  placeholder="1-4"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleHideCustomInput} className="flex-1">
                Back
              </Button>
              <Button onClick={handleCustomSubmit} className="flex-1">
                Go to Q{customQuarter} {customYear}
              </Button>
            </div>
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}
