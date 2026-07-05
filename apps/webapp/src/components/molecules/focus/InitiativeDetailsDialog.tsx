'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { CheckCircle2, Circle, Flag, Pencil } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FixedSizeDialog,
  FixedSizeDialogActions,
  FixedSizeDialogContent,
  FixedSizeDialogTitle,
} from '@/components/ui/fixed-size-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  formatInitiativeDateRange,
  getInitiativeDateStatus,
  type InitiativeDateStatus,
} from '@/lib/date/initiative-dates';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

export interface InitiativeDetailsDialogProps {
  initiative: Doc<'initiatives'> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (initiative: Doc<'initiatives'>) => void;
}

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

function formatQuarterlyGoalLabel(goal: Doc<'goals'>): string {
  return `Q${goal.quarter} ${goal.year}`;
}

function formatStructuredWeeklyLabel(goal: Doc<'goals'>): string {
  return `Q${goal.quarter} ${goal.year}`;
}

function formatDailyGoalLabel(goal: Doc<'goals'>): string {
  return `Q${goal.quarter} ${goal.year}`;
}

function formatAdhocGoalLabel(goal: Doc<'goals'>): string {
  const week = goal.adhoc?.weekNumber;
  return week ? `Week ${week}, ${goal.year}` : `${goal.year}`;
}

function GoalListItem({ goal, contextLabel }: { goal: Doc<'goals'>; contextLabel: string }) {
  return (
    <li className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-accent/40">
      {goal.isComplete ? (
        <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      ) : (
        <Circle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm truncate',
            goal.isComplete && 'line-through text-muted-foreground'
          )}
        >
          {goal.title}
        </p>
        <p className="text-xs text-muted-foreground">{contextLabel}</p>
      </div>
    </li>
  );
}

function GoalTabPanel({
  goals,
  emptyMessage,
  getContextLabel,
}: {
  goals: Doc<'goals'>[];
  emptyMessage: string;
  getContextLabel: (goal: Doc<'goals'>) => string;
}) {
  if (goals.length === 0) {
    return <p className="px-4 py-8 text-sm text-center text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-1 overflow-y-auto px-2">
      {goals.map((goal) => (
        <GoalListItem key={goal._id} goal={goal} contextLabel={getContextLabel(goal)} />
      ))}
    </ul>
  );
}

// fallow-ignore-next-line complexity
export function InitiativeDetailsDialog({
  initiative,
  open,
  onOpenChange,
  onEdit,
}: InitiativeDetailsDialogProps) {
  const { sessionId } = useSession();
  const goalsByType = useQuery(
    api.initiative.getGoalsByInitiative,
    open && initiative ? { sessionId, initiativeId: initiative._id } : 'skip'
  );

  const totalCount = useMemo(() => {
    if (!goalsByType) return 0;
    return (
      goalsByType.quarterly.length +
      goalsByType.weekly.length +
      goalsByType.daily.length +
      goalsByType.adhoc.length
    );
  }, [goalsByType]);

  if (!initiative) return null;

  const status = getInitiativeDateStatus(initiative.startDate, initiative.endDate);
  const badge = statusBadge[status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FixedSizeDialog>
        <DialogHeader className="sr-only">
          <DialogTitle>{initiative.title}</DialogTitle>
        </DialogHeader>
        <FixedSizeDialogTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Flag className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate">{initiative.title}</span>
            <span className="text-xs font-normal text-muted-foreground">({totalCount})</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
            onClick={() => onEdit(initiative)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        </FixedSizeDialogTitle>
        <FixedSizeDialogContent className="p-0 flex flex-col">
          <div className="px-4 py-3 border-b space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {formatInitiativeDateRange(initiative.startDate, initiative.endDate)}
              </p>
              <span
                className={cn(
                  'inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                  badge.className
                )}
              >
                {badge.label}
              </span>
            </div>
            {initiative.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {initiative.description}
              </p>
            )}
          </div>

          {goalsByType === undefined ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <Tabs defaultValue="quarterly" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
                <TabsTrigger value="quarterly">
                  Quarterly ({goalsByType.quarterly.length})
                </TabsTrigger>
                <TabsTrigger value="weekly">Weekly ({goalsByType.weekly.length})</TabsTrigger>
                <TabsTrigger value="daily">Daily ({goalsByType.daily.length})</TabsTrigger>
                <TabsTrigger value="adhoc">Adhoc ({goalsByType.adhoc.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="quarterly" className="flex-1 mt-0 py-2 overflow-y-auto">
                <GoalTabPanel
                  goals={goalsByType.quarterly}
                  emptyMessage="No quarterly goals tagged to this initiative."
                  getContextLabel={formatQuarterlyGoalLabel}
                />
              </TabsContent>
              <TabsContent value="weekly" className="flex-1 mt-0 py-2 overflow-y-auto">
                <GoalTabPanel
                  goals={goalsByType.weekly}
                  emptyMessage="No weekly goals tagged to this initiative."
                  getContextLabel={formatStructuredWeeklyLabel}
                />
              </TabsContent>
              <TabsContent value="daily" className="flex-1 mt-0 py-2 overflow-y-auto">
                <GoalTabPanel
                  goals={goalsByType.daily}
                  emptyMessage="No daily goals tagged to this initiative."
                  getContextLabel={formatDailyGoalLabel}
                />
              </TabsContent>
              <TabsContent value="adhoc" className="flex-1 mt-0 py-2 overflow-y-auto">
                <GoalTabPanel
                  goals={goalsByType.adhoc}
                  emptyMessage="No adhoc goals tagged to this initiative."
                  getContextLabel={formatAdhocGoalLabel}
                />
              </TabsContent>
            </Tabs>
          )}
        </FixedSizeDialogContent>
        <FixedSizeDialogActions>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </FixedSizeDialogActions>
      </FixedSizeDialog>
    </Dialog>
  );
}
