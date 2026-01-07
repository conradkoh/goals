import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import type { DayOfWeek } from '@workspace/backend/src/constants';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';

import { DomainSelector } from '@/components/atoms/DomainSelector';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Data structure for submitting an adhoc goal form.
 */
export interface AdhocGoalFormData {
  /** Goal title */
  title: string;
  /** Optional description */
  details?: string;
  /** Optional domain association */
  domainId?: Id<'domains'> | null;
  /** ISO week year */
  year: number;
  /** ISO week number */
  weekNumber: number;
  /** Optional day assignment (deprecated - adhoc tasks are week-level) */
  dayOfWeek?: DayOfWeek;
  /** Optional due date timestamp */
  dueDate?: number;
}

/**
 * Props for the AdhocGoalForm component.
 */
export interface AdhocGoalFormProps {
  /** Available domains for selection */
  domains: Doc<'domains'>[];
  /** Initial goal data for editing */
  initialGoal?: Partial<Doc<'goals'> & { domain?: Doc<'domains'> }>;
  /** Callback when form is submitted */
  onSubmit: (data: AdhocGoalFormData) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Callback to create a new domain */
  onDomainCreate?: (name: string, description?: string, color?: string) => Promise<Id<'domains'>>;
  /** Callback to update an existing domain */
  onDomainUpdate?: (
    domainId: Id<'domains'>,
    name: string,
    description?: string,
    color?: string
  ) => Promise<void>;
  /** Callback to delete a domain */
  onDomainDelete?: (domainId: Id<'domains'>) => Promise<void>;
  /** Label for submit button */
  submitLabel?: string;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Form component for creating and editing adhoc goals.
 * Supports title, description, domain selection, week number, and due date.
 */
export function AdhocGoalForm({
  domains,
  initialGoal,
  onSubmit,
  onCancel,
  onDomainCreate,
  onDomainUpdate,
  onDomainDelete,
  submitLabel = 'Create Adhoc Goal',
  className,
}: AdhocGoalFormProps) {
  const [title, setTitle] = useState(initialGoal?.title || '');
  const [details, setDetails] = useState(initialGoal?.details || '');
  const [domainId, setDomainId] = useState<Id<'domains'> | null>(initialGoal?.domainId || null);
  const [weekNumber, setWeekNumber] = useState<number | undefined>(initialGoal?.adhoc?.weekNumber);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialGoal?.adhoc?.dueDate ? new Date(initialGoal.adhoc.dueDate) : undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handles form submission.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const { year, weekNumber: currentWeekNumber } = _getCurrentISOYearAndWeek();
      await onSubmit({
        title: title.trim(),
        details: details.trim() || undefined,
        domainId: domainId || undefined,
        year: initialGoal?.year ?? year,
        weekNumber: weekNumber ?? currentWeekNumber,
        dueDate: dueDate?.getTime(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles creating a new domain from within the selector.
   */
  const handleDomainCreate = async (name: string, description?: string, color?: string) => {
    if (onDomainCreate) {
      const newDomainId = await onDomainCreate(name, description, color);
      setDomainId(newDomainId);
      return newDomainId;
    }
    throw new Error('Domain creation handler not provided');
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to get done?"
          required
        />
      </div>

      <div>
        <Label htmlFor="details">Description (optional)</Label>
        <Textarea
          id="details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Add more details about this task..."
          rows={3}
        />
      </div>

      <div>
        <Label>Domain</Label>
        <DomainSelector
          domains={domains}
          selectedDomainId={domainId}
          onDomainChange={(value) => setDomainId(value as Id<'domains'> | null)}
          onDomainCreate={handleDomainCreate}
          onDomainUpdate={onDomainUpdate}
          onDomainDelete={onDomainDelete}
          placeholder="Select a domain (optional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="week-number">Week Number</Label>
          <Input
            id="week-number"
            type="number"
            min="1"
            max="53"
            value={weekNumber || ''}
            onChange={(e) =>
              setWeekNumber(e.target.value ? Number.parseInt(e.target.value) : undefined)
            }
            placeholder={_getCurrentISOYearAndWeek().weekNumber.toString()}
          />
        </div>

        {/* Day of Week removed - adhoc tasks are week-level only */}
      </div>

      <div>
        <Label>Due Date (optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !dueDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={setDueDate}
              defaultMonth={dueDate}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={!title.trim() || isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

/**
 * Gets the current ISO year and week number.
 *
 * @returns Object containing year and weekNumber
 */
function _getCurrentISOYearAndWeek(): { year: number; weekNumber: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const weekNumber = Math.ceil(diff / oneWeek);
  const year = now.getFullYear();

  return { year, weekNumber };
}
