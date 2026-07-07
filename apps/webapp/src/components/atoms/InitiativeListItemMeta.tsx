import type { Doc } from '@workspace/backend/convex/_generated/dataModel';

import { formatInitiativeDateRange, getInitiativeDateStatus } from '@/lib/date/initiative-dates';
import { initiativeStatusBadge } from '@/lib/initiative/initiative-status-badge';
import { cn } from '@/lib/utils';

type InitiativeListItemMetaProps = {
  initiative: Pick<Doc<'initiatives'>, 'startDate' | 'endDate' | 'title'>;
};

export function InitiativeListItemMeta({ initiative }: InitiativeListItemMetaProps) {
  const status = getInitiativeDateStatus(initiative.startDate, initiative.endDate);
  const badge = initiativeStatusBadge[status];

  return (
    <span className="flex items-center gap-2 min-w-0 flex-1">
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
  );
}
