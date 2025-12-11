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

  // Reset custom input state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowCustomInput(false);
      setCustomYear(selectedYear.toString());
      setCustomQuarter(selectedQuarter.toString());
    }
  }, [open, selectedYear, selectedQuarter]);

  // Generate quarter options organized by sections
  const { quickJumpOptions, thisYearOptions, nextYearOptions, lastYearOptions } = useMemo(() => {
    // Helper function to get next quarter
    const getNextQuarter = (year: number, quarter: number): { year: number; quarter: number } => {
      if (quarter === 4) {
        return { year: year + 1, quarter: 1 };
      }
      return { year, quarter: quarter + 1 };
    };

    // Helper function to get previous quarter
    const getPreviousQuarter = (
      year: number,
      quarter: number
    ): { year: number; quarter: number } => {
      if (quarter === 1) {
        return { year: year - 1, quarter: 4 };
      }
      return { year, quarter: quarter - 1 };
    };

    const quickJump: _QuarterOption[] = [];
    const years = [actualCurrentYear - 1, actualCurrentYear, actualCurrentYear + 1];

    // Generate all quarters first
    const allQuarters: _QuarterOption[] = [];
    for (const year of years) {
      for (const quarter of [1, 2, 3, 4]) {
        allQuarters.push({
          label: `Q${quarter} ${year}`,
          year,
          quarter,
          isSelected: year === selectedYear && quarter === selectedQuarter,
        });
      }
    }

    // Build quick jump list (top 3):
    // 1. Current quarter (always shown)
    const currentQuarterOption = allQuarters.find(
      (q) => q.year === actualCurrentYear && q.quarter === actualCurrentQuarter
    );
    if (currentQuarterOption) {
      quickJump.push(currentQuarterOption);
    }

    // 2. Next quarter
    const nextQuarter = getNextQuarter(actualCurrentYear, actualCurrentQuarter);
    const nextQuarterOption = allQuarters.find(
      (q) => q.year === nextQuarter.year && q.quarter === nextQuarter.quarter
    );
    if (nextQuarterOption) {
      quickJump.push(nextQuarterOption);
    }

    // 3. Previous quarter
    const prevQuarter = getPreviousQuarter(actualCurrentYear, actualCurrentQuarter);
    const prevQuarterOption = allQuarters.find(
      (q) => q.year === prevQuarter.year && q.quarter === prevQuarter.quarter
    );
    if (prevQuarterOption) {
      quickJump.push(prevQuarterOption);
    }

    // Organize remaining quarters by year
    const thisYear = allQuarters.filter((q) => q.year === actualCurrentYear);
    const nextYear = allQuarters.filter((q) => q.year === actualCurrentYear + 1);
    const lastYear = allQuarters.filter((q) => q.year === actualCurrentYear - 1);

    return {
      quickJumpOptions: quickJump,
      thisYearOptions: thisYear,
      nextYearOptions: nextYear,
      lastYearOptions: lastYear,
    };
  }, [actualCurrentYear, actualCurrentQuarter, selectedYear, selectedQuarter]);

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
            <CommandGroup heading="Quick Jump">
              {quickJumpOptions.map((option) => {
                // Check if this is the current quarter
                const isCurrentQuarter =
                  option.year === actualCurrentYear && option.quarter === actualCurrentQuarter;

                return (
                  <CommandItem
                    key={`${option.year}-${option.quarter}`}
                    value={option.label}
                    onSelect={() => handleSelect(option.year, option.quarter)}
                    className="flex items-center gap-2"
                  >
                    {isCurrentQuarter ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <Calendar className="h-4 w-4" />
                    )}
                    <span>{option.label}</span>
                    {isCurrentQuarter && (
                      <span className="ml-auto text-xs text-muted-foreground">(current)</span>
                    )}
                    {option.isSelected && !isCurrentQuarter && (
                      <span className="ml-auto text-xs text-muted-foreground">(viewing)</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandGroup heading="This Year">
              {thisYearOptions.map((option) => {
                const isCurrentQuarter =
                  option.year === actualCurrentYear && option.quarter === actualCurrentQuarter;

                return (
                  <CommandItem
                    key={`${option.year}-${option.quarter}`}
                    value={option.label}
                    onSelect={() => handleSelect(option.year, option.quarter)}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>{option.label}</span>
                    {isCurrentQuarter && (
                      <span className="ml-auto text-xs text-muted-foreground">(current)</span>
                    )}
                    {option.isSelected && !isCurrentQuarter && (
                      <span className="ml-auto text-xs text-muted-foreground">(viewing)</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandGroup heading="Next Year">
              {nextYearOptions.map((option) => {
                return (
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
                );
              })}
            </CommandGroup>

            <CommandGroup heading="Last Year">
              {lastYearOptions.map((option) => {
                return (
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
                );
              })}
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
