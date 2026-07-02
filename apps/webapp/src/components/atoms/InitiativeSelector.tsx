import type { Doc } from '@workspace/backend/convex/_generated/dataModel';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatInitiativeDateRange } from '@/lib/date/initiative-dates';
import { cn } from '@/lib/utils';

interface InitiativeSelectorProps {
  initiatives: Doc<'initiatives'>[];
  selectedInitiativeId?: string | null;
  onInitiativeChange: (initiativeId: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function InitiativeSelector({
  initiatives,
  selectedInitiativeId,
  onInitiativeChange,
  placeholder = 'Select an initiative...',
  className,
  disabled = false,
}: InitiativeSelectorProps) {
  const selectValue =
    selectedInitiativeId === undefined || selectedInitiativeId === null
      ? '__none__'
      : selectedInitiativeId;

  return (
    <div className="space-y-1">
      <Select
        value={selectValue}
        onValueChange={(value) => onInitiativeChange(value === '__none__' ? null : value)}
        disabled={disabled}
      >
        <SelectTrigger className={cn(className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__" className="text-muted-foreground">
            None
          </SelectItem>
          {initiatives.map((initiative) => (
            <SelectItem key={initiative._id} value={initiative._id}>
              {`${initiative.title} (${formatInitiativeDateRange(initiative.startDate, initiative.endDate)})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Create and manage initiatives in Focus view.</p>
    </div>
  );
}
