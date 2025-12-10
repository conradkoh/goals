import { Calendar } from 'lucide-react';
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

interface QuarterJumpDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current year */
  currentYear: number;
  /** Current quarter (1-4) */
  currentQuarter: number;
  /** Callback when a quarter is selected */
  onQuarterSelect: (year: number, quarter: number) => void;
}

interface QuarterOption {
  label: string;
  year: number;
  quarter: number;
  isCurrent: boolean;
}

/**
 * Dialog for quickly jumping to a specific quarter.
 * Opened via Cmd+K keyboard shortcut.
 * Shows recent quarters and allows custom year/quarter input.
 */
export function QuarterJumpDialog({
  open,
  onOpenChange,
  currentYear,
  currentQuarter,
  onQuarterSelect,
}: QuarterJumpDialogProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customYear, setCustomYear] = useState(currentYear.toString());
  const [customQuarter, setCustomQuarter] = useState(currentQuarter.toString());

  // Reset custom input state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowCustomInput(false);
      setCustomYear(currentYear.toString());
      setCustomQuarter(currentQuarter.toString());
    }
  }, [open, currentYear, currentQuarter]);

  // Generate quarter options (current year -1 to +1, all quarters)
  const quarterOptions = useMemo((): QuarterOption[] => {
    const options: QuarterOption[] = [];
    const years = [currentYear - 1, currentYear, currentYear + 1];

    for (const year of years) {
      for (const quarter of [1, 2, 3, 4]) {
        options.push({
          label: `Q${quarter} ${year}`,
          year,
          quarter,
          isCurrent: year === currentYear && quarter === currentQuarter,
        });
      }
    }

    return options;
  }, [currentYear, currentQuarter]);

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

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to quarter... (e.g. Q1 2024)" />
      <CommandList>
        <CommandEmpty>No quarter found.</CommandEmpty>

        {!showCustomInput && (
          <>
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
                  {option.isCurrent && (
                    <span className="ml-auto text-xs text-muted-foreground">(current)</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Other">
              <CommandItem
                onSelect={() => setShowCustomInput(true)}
                className="flex items-center gap-2"
              >
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
                  onChange={(e) => setCustomYear(e.target.value)}
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
                  onChange={(e) => setCustomQuarter(e.target.value)}
                  placeholder="1-4"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCustomInput(false)}
                className="flex-1"
              >
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
