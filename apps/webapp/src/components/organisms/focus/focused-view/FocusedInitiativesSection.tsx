'use client';

import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { Flag, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FocusedGoalSection } from './FocusedGoalSection';

import { InitiativeDetailsDialog } from '@/components/molecules/focus/InitiativeDetailsDialog';
import {
  InitiativeFormDialog,
  type InitiativeFormDialogProps,
} from '@/components/molecules/focus/InitiativeFormDialog';
import {
  formatInitiativeDateRange,
  getInitiativeDateStatus,
  type InitiativeDateStatus,
} from '@/lib/date/initiative-dates';
import { cn } from '@/lib/utils';

interface FocusedInitiativesSectionProps {
  initiatives: Doc<'initiatives'>[];
  onCreate: InitiativeFormDialogProps['onCreate'];
  onUpdate: InitiativeFormDialogProps['onUpdate'];
  onDelete: InitiativeFormDialogProps['onDelete'];
  isSubmitting?: boolean;
}

const statusOrder: Record<InitiativeDateStatus, number> = {
  active: 0,
  upcoming: 1,
  ended: 2,
};

const statusBadge: Record<InitiativeDateStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400',
  },
  upcoming: {
    label: 'Upcoming',
    className: 'bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400',
  },
  ended: { label: 'Ended', className: 'bg-muted text-muted-foreground' },
};

export function FocusedInitiativesSection({
  initiatives,
  onCreate,
  onUpdate,
  onDelete,
  isSubmitting,
}: FocusedInitiativesSectionProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingInitiative, setViewingInitiative] = useState<Doc<'initiatives'> | null>(null);
  const [editingInitiative, setEditingInitiative] = useState<Doc<'initiatives'> | null>(null);

  const sortedInitiatives = useMemo(() => {
    return [...initiatives].sort((a, b) => {
      const statusA = getInitiativeDateStatus(a.startDate, a.endDate);
      const statusB = getInitiativeDateStatus(b.startDate, b.endDate);
      const statusDiff = statusOrder[statusA] - statusOrder[statusB];
      if (statusDiff !== 0) return statusDiff;
      return a.startDate - b.startDate || a.title.localeCompare(b.title);
    });
  }, [initiatives]);

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
        count={initiatives.length}
        icon={<Flag className="h-3.5 w-3.5 text-muted-foreground" />}
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
            No initiatives yet. Create one to group goals across quarters.
          </p>
        ) : (
          <div className="px-4 py-2">
            <ul className="space-y-1">
              {sortedInitiatives.map((initiative) => {
                const status = getInitiativeDateStatus(initiative.startDate, initiative.endDate);
                const badge = statusBadge[status];

                return (
                  <li key={initiative._id}>
                    <div className="flex items-start gap-1 rounded-md hover:bg-accent/50 transition-colors">
                      <button
                        type="button"
                        onClick={() => setViewingInitiative(initiative)}
                        className="flex-1 min-w-0 text-left px-2 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {initiative.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatInitiativeDateRange(initiative.startDate, initiative.endDate)}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingInitiative(initiative)}
                        className="h-7 w-7 mt-1.5 mr-1 flex-shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center"
                        aria-label="Edit initiative"
                      >
                        <Pencil className="h-3.5 w-3.5" />
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
              })}
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
    </>
  );
}
