'use client';

import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import { Flag } from 'lucide-react';
import { useMemo } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { sortInitiativesByStatusAndDate } from '@/lib/initiative/initiative-status-badge';

interface FocusedInitiativeFilterProps {
  initiatives: Doc<'initiatives'>[];
  selectedInitiativeId: Id<'initiatives'> | null;
  onInitiativeChange: (initiativeId: Id<'initiatives'> | null) => void;
}

export function FocusedInitiativeFilter({
  initiatives,
  selectedInitiativeId,
  onInitiativeChange,
}: FocusedInitiativeFilterProps) {
  const sorted = useMemo(() => sortInitiativesByStatusAndDate(initiatives), [initiatives]);

  const value = selectedInitiativeId ?? '__all__';

  return (
    <div className="px-4 py-2 border-b bg-muted/30">
      <div className="flex items-center gap-2">
        <Flag className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <Select
          value={value}
          onValueChange={(v) =>
            onInitiativeChange(v === '__all__' ? null : (v as Id<'initiatives'>))
          }
        >
          <SelectTrigger className="h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0">
            <SelectValue placeholder="All initiatives" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All initiatives</SelectItem>
            {sorted.map((initiative) => (
              <SelectItem key={initiative._id} value={initiative._id}>
                {initiative.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
