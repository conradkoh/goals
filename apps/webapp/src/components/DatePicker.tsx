'use client';

import { CalendarIcon, XIcon } from 'lucide-react';
import { DateTime } from 'luxon';
import * as React from 'react';

import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

import { cn } from '@/lib/utils';

function isDateDisabled(date: Date, allowFutureDates: boolean, minDate?: Date): boolean {
  return (!allowFutureDates && date > new Date()) || (minDate != null && date < minDate);
}

interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  allowFutureDates?: boolean;
  /** Minimum selectable date (inclusive) */
  minDate?: Date;
  /** Show clear button when a date is selected */
  clearable?: boolean;
}

// fallow-ignore-next-line complexity
export function DatePicker({
  value,
  onChange,
  className,
  disabled = false,
  placeholder = 'Select date',
  allowFutureDates = false,
  minDate,
  clearable = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const formatDate = () => {
    if (!value) return placeholder;
    return DateTime.fromJSDate(value).toFormat('MMM d, yyyy');
  };

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
    if (date) setIsOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover modal open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDate()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
            defaultMonth={value}
            disabled={(date) => isDateDisabled(date, allowFutureDates, minDate)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {clearable && value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0"
          aria-label="Clear date"
          onClick={() => onChange(undefined)}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
