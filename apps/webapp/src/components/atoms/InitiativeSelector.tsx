'use client';

import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';

import { InitiativeListItemMeta } from '@/components/atoms/InitiativeListItemMeta';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatInitiativeDateRange } from '@/lib/date/initiative-dates';
import { sortInitiativesByStatusAndDate } from '@/lib/initiative/initiative-status-badge';
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

// fallow-ignore-next-line complexity
export function InitiativeSelector({
  initiatives,
  selectedInitiativeId,
  onInitiativeChange,
  placeholder = 'Select an initiative...',
  className,
  disabled = false,
  compact = false,
}: InitiativeSelectorProps) {
  const [open, setOpen] = useState(false);

  const sortedInitiatives = useMemo(
    () => sortInitiativesByStatusAndDate(initiatives),
    [initiatives]
  );

  const selectedInitiative =
    selectedInitiativeId == null
      ? null
      : (sortedInitiatives.find((i) => i._id === selectedInitiativeId) ?? null);

  const handleSelect = (initiativeId: string | null) => {
    onInitiativeChange(initiativeId);
    setOpen(false);
  };

  return (
    <div className="space-y-1">
      <Popover modal open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn('w-full justify-between font-normal', className)}
          >
            <span className="truncate">
              {selectedInitiative ? selectedInitiative.title : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {/*
          portalled={false}: keep combobox in the dialog DOM tree so Safari can
          focus/click the search input (Radix portal + dialog focus trap blocks it).
          modal on Popover (above) still required so the list opens inside dialogs.
        */}
        <PopoverContent
          portalled={false}
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search initiatives..." />
            <CommandList>
              <CommandEmpty>No initiative found.</CommandEmpty>
              <CommandGroup>
                <CommandItem value="none no initiative" onSelect={() => handleSelect(null)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedInitiativeId == null ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="text-muted-foreground">None</span>
                </CommandItem>
                {sortedInitiatives.map((initiative) => {
                  const isSelected = selectedInitiativeId === initiative._id;
                  return (
                    <CommandItem
                      key={initiative._id}
                      value={`${initiative._id} ${initiative.title} ${formatInitiativeDateRange(initiative.startDate, initiative.endDate)}`}
                      onSelect={() => handleSelect(initiative._id)}
                    >
                      <Check
                        className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                      />
                      <InitiativeListItemMeta initiative={initiative} />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Create and manage initiatives in Focus view.
        </p>
      )}
    </div>
  );
}
