import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { useMemo } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatInitiativeDateRange, getInitiativeDateStatus } from '@/lib/date/initiative-dates';
import {
  initiativeStatusBadge,
  initiativeStatusOrder,
} from '@/lib/initiative/initiative-status-badge';
import { cn } from '@/lib/utils';

interface InitiativeSelectorProps {
  initiatives: Doc<'initiatives'>[];
  selectedInitiativeId?: string | null;
  onInitiativeChange: (initiativeId: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Hide the Focus view help text (for compact goal detail layouts). */
  compact?: boolean;
}

export function InitiativeSelector({
  initiatives,
  selectedInitiativeId,
  onInitiativeChange,
  placeholder = 'Select an initiative...',
  className,
  disabled = false,
  compact = false,
}: InitiativeSelectorProps) {
  const sortedInitiatives = useMemo(() => {
    return [...initiatives].sort((a, b) => {
      const statusA = getInitiativeDateStatus(a.startDate, a.endDate);
      const statusB = getInitiativeDateStatus(b.startDate, b.endDate);
      const statusDiff = initiativeStatusOrder[statusA] - initiativeStatusOrder[statusB];
      if (statusDiff !== 0) return statusDiff;
      return a.startDate - b.startDate || a.title.localeCompare(b.title);
    });
  }, [initiatives]);

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
          {sortedInitiatives.map((initiative) => {
            const status = getInitiativeDateStatus(initiative.startDate, initiative.endDate);
            const badge = initiativeStatusBadge[status];
            return (
              <SelectItem key={initiative._id} value={initiative._id}>
                <span className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{initiative.title}</span>
                  <span
                    className={cn(
                      'flex-shrink-0 inline-flex px-1 py-0 rounded text-[9px] font-bold uppercase',
                      badge.className
                    )}
                  >
                    {badge.label}
                  </span>
                  <span className="flex-shrink-0 text-muted-foreground text-xs">
                    {formatInitiativeDateRange(initiative.startDate, initiative.endDate)}
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Create and manage initiatives in Focus view.
        </p>
      )}
    </div>
  );
}
