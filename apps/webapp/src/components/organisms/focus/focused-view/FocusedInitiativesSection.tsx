'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { Flag, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FocusedGoalSection } from './FocusedGoalSection';

import { InitiativeDetailsDialog } from '@/components/molecules/focus/InitiativeDetailsDialog';
import {
  InitiativeFormDialog,
  type InitiativeFormDialogProps,
} from '@/components/molecules/focus/InitiativeFormDialog';
import { InitiativesBrowseDialog } from '@/components/molecules/focus/InitiativesBrowseDialog';
import { formatInitiativeDateRange, getInitiativeDateStatus } from '@/lib/date/initiative-dates';
import { getInitiativeColorFromTitle } from '@/lib/initiative/initiative-color';
import { filterInitiativesForFocusView } from '@/lib/initiative/initiative-focus-filters';
import {
  initiativeStatusBadge,
  sortInitiativesByStatusAndDate,
} from '@/lib/initiative/initiative-status-badge';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

interface FocusedInitiativesSectionProps {
  initiatives: Doc<'initiatives'>[];
  onCreate: InitiativeFormDialogProps['onCreate'];
  onUpdate: InitiativeFormDialogProps['onUpdate'];
  onDelete: InitiativeFormDialogProps['onDelete'];
  isSubmitting?: boolean;
}

// fallow-ignore-next-line complexity
function formatGoalCountLabel(counts: { total: number; open: number }): string | null {
  if (counts.total === 0) return null;
  if (counts.open > 0) {
    return `${counts.open} open goal${counts.open === 1 ? '' : 's'}`;
  }
  return `${counts.total} goal${counts.total === 1 ? '' : 's'} (all done)`;
}

function InitiativeListRow({
  initiative,
  counts,
  onView,
}: {
  initiative: Doc<'initiatives'>;
  counts?: { total: number; open: number };
  onView: () => void;
}) {
  const status = getInitiativeDateStatus(initiative.startDate, initiative.endDate);
  const badge = initiativeStatusBadge[status];
  const goalCountLabel = counts ? formatGoalCountLabel(counts) : null;
  const initiativeColor = getInitiativeColorFromTitle(initiative.title);

  return (
    <li>
      <div className="flex items-start gap-1 rounded-md hover:bg-accent/50 transition-colors">
        <button type="button" onClick={onView} className="flex-1 min-w-0 text-left px-2 py-2">
          <div className="min-w-0 flex items-start gap-2">
            <span
              className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full"
              style={{ backgroundColor: initiativeColor }}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{initiative.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatInitiativeDateRange(initiative.startDate, initiative.endDate)}
                {goalCountLabel && <span>{` · ${goalCountLabel}`}</span>}
              </p>
            </div>
          </div>
        </button>
        <span
          className={cn(
            'mt-2 mr-2 flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
            badge.className
          )}
        >
          {badge.label}
        </span>
      </div>
    </li>
  );
}

export function FocusedInitiativesSection({
  initiatives,
  onCreate,
  onUpdate,
  onDelete,
  isSubmitting,
}: FocusedInitiativesSectionProps) {
  const { sessionId } = useSession();
  const goalCounts = useQuery(api.initiative.getInitiativeGoalCounts, { sessionId });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [viewingInitiative, setViewingInitiative] = useState<Doc<'initiatives'> | null>(null);
  const [editingInitiative, setEditingInitiative] = useState<Doc<'initiatives'> | null>(null);

  const focusInitiatives = useMemo(() => filterInitiativesForFocusView(initiatives), [initiatives]);

  const sortedInitiatives = useMemo(
    () => sortInitiativesByStatusAndDate(focusInitiatives),
    [focusInitiatives]
  );

  const isFormOpen = isCreateOpen || editingInitiative !== null;

  const handleFormOpenChange = (open: boolean) => {
    if (!open) {
      setIsCreateOpen(false);
      setEditingInitiative(null);
    }
  };

  return (
    <>
      <FocusedGoalSection
        title="Initiatives"
        description="Date-bounded efforts that can span multiple quarters."
        count={focusInitiatives.length}
        icon={<Flag className="h-3.5 w-3.5 text-muted-foreground" />}
        onTitleClick={() => setIsBrowseOpen(true)}
        action={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="h-5 w-5 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center"
            aria-label="Add initiative"
          >
            <Plus className="h-3 w-3" />
          </button>
        }
      >
        {sortedInitiatives.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            {initiatives.length === 0
              ? 'No initiatives yet. Create one to group goals across quarters.'
              : 'No active initiatives. Click the header to browse past initiatives.'}
          </p>
        ) : (
          <div className="px-4 py-2">
            <ul className="space-y-1">
              {sortedInitiatives.map((initiative) => (
                <InitiativeListRow
                  key={initiative._id}
                  initiative={initiative}
                  counts={goalCounts?.[initiative._id]}
                  onView={() => setViewingInitiative(initiative)}
                />
              ))}
            </ul>
          </div>
        )}
      </FocusedGoalSection>

      <InitiativeDetailsDialog
        initiative={viewingInitiative}
        open={viewingInitiative !== null}
        onOpenChange={(open) => {
          if (!open) setViewingInitiative(null);
        }}
        onEdit={(initiative) => {
          setViewingInitiative(null);
          setEditingInitiative(initiative);
        }}
        onUpdateEndDate={async (initiativeId, endDate) => {
          await onUpdate(initiativeId, { endDate });
        }}
      />

      <InitiativeFormDialog
        open={isFormOpen}
        onOpenChange={handleFormOpenChange}
        initiative={editingInitiative}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
        isSubmitting={isSubmitting}
      />

      <InitiativesBrowseDialog
        open={isBrowseOpen}
        onOpenChange={setIsBrowseOpen}
        initiatives={initiatives}
        onSelectInitiative={setViewingInitiative}
      />
    </>
  );
}
