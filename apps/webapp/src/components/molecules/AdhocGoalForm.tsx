import type { Doc, Id } from '@services/backend/convex/_generated/dataModel';
import { DayOfWeek } from '@services/backend/src/constants';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { DomainSelector } from '@/components/atoms/DomainSelector';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface AdhocGoalFormProps {
  domains: Doc<'domains'>[];
  initialGoal?: Partial<Doc<'goals'> & { domain?: Doc<'domains'> }>;
  onSubmit: (data: {
    title: string;
    details?: string;
    domainId?: Id<'domains'> | null;
    weekNumber?: number;
    dayOfWeek?: DayOfWeek;
    dueDate?: number;
  }) => Promise<void>;
  onCancel?: () => void;
  onDomainCreate?: (name: string, description?: string, color?: string) => Promise<void>;
  submitLabel?: string;
  className?: string;
}

const DAY_OPTIONS = [
  { value: DayOfWeek.MONDAY, label: 'Monday' },
  { value: DayOfWeek.TUESDAY, label: 'Tuesday' },
  { value: DayOfWeek.WEDNESDAY, label: 'Wednesday' },
  { value: DayOfWeek.THURSDAY, label: 'Thursday' },
  { value: DayOfWeek.FRIDAY, label: 'Friday' },
  { value: DayOfWeek.SATURDAY, label: 'Saturday' },
  { value: DayOfWeek.SUNDAY, label: 'Sunday' },
];

export function AdhocGoalForm({
  domains,
  initialGoal,
  onSubmit,
  onCancel,
  onDomainCreate,
  submitLabel = 'Create Adhoc Goal',
  className,
}: AdhocGoalFormProps) {
  const [title, setTitle] = useState(initialGoal?.title || '');
  const [details, setDetails] = useState(initialGoal?.details || '');
  const [domainId, setDomainId] = useState<Id<'domains'> | null>(
    initialGoal?.adhoc?.domainId || null
  );
  const [weekNumber, setWeekNumber] = useState<number | undefined>(initialGoal?.adhoc?.weekNumber);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek | undefined>(initialGoal?.adhoc?.dayOfWeek);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialGoal?.adhoc?.dueDate ? new Date(initialGoal.adhoc.dueDate) : undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        details: details.trim() || undefined,
        domainId: domainId || undefined,
        weekNumber: weekNumber || getCurrentISOWeekNumber(),
        dayOfWeek,
        dueDate: dueDate?.getTime(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDomainCreate = async (name: string, description?: string, color?: string) => {
    if (onDomainCreate) {
      await onDomainCreate(name, description, color);
    }
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
            placeholder={getCurrentISOWeekNumber().toString()}
          />
        </div>

        <div>
          <Label>Day of Week (optional)</Label>
          <Select
            value={dayOfWeek?.toString() || '__none__'}
            onValueChange={(value) =>
              setDayOfWeek(value === '__none__' ? undefined : (Number.parseInt(value) as DayOfWeek))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No specific day</SelectItem>
              {DAY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

// Helper function to get current ISO week number
function getCurrentISOWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}
