'use client';

import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { Flag } from 'lucide-react';
import { useMemo, useState } from 'react';

import { InitiativeListItemMeta } from '@/components/atoms/InitiativeListItemMeta';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  buildInitiativeColorMap,
  getInitiativeColorFromMap,
} from '@/lib/initiative/initiative-color';
import { getInitiativesForBrowse } from '@/lib/initiative/initiative-focus-filters';
import { sortInitiativesByStatusAndDate } from '@/lib/initiative/initiative-status-badge';

export interface InitiativesBrowseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initiatives: Doc<'initiatives'>[];
  onSelectInitiative: (initiative: Doc<'initiatives'>) => void;
}

export function InitiativesBrowseDialog({
  open,
  onOpenChange,
  initiatives,
  onSelectInitiative,
}: InitiativesBrowseDialogProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => sortInitiativesByStatusAndDate(getInitiativesForBrowse(initiatives, query)),
    [initiatives, query]
  );

  const colorMap = useMemo(() => buildInitiativeColorMap(initiatives), [initiatives]);

  const handleSelect = (initiative: Doc<'initiatives'>) => {
    onSelectInitiative(initiative);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery('');
      }}
      title="Initiatives"
      description="Initiatives active in the last 6 months. Search to find older ones."
    >
      <CommandInput placeholder="Search initiatives..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>
          {query.trim() ? 'No initiatives found.' : 'No initiatives in the last 6 months.'}
        </CommandEmpty>
        <CommandGroup>
          {filtered.map((initiative) => (
            <CommandItem
              key={initiative._id}
              value={`${initiative._id} ${initiative.title}`}
              onSelect={() => handleSelect(initiative)}
            >
              <Flag className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
              <InitiativeListItemMeta
                initiative={initiative}
                color={getInitiativeColorFromMap(initiative._id, colorMap)}
              />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
