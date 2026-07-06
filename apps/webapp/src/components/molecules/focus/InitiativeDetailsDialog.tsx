'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { CheckCircle2, Circle, Flag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { InitiativeActionMenu } from '@/components/molecules/focus/InitiativeActionMenu';
import { StandaloneGoalModal } from '@/components/molecules/goal-details-popover/variants/StandaloneGoalModal';
import { Button } from '@/components/ui/button';
import {
  CollapsibleMinimal,
  CollapsibleMinimalContent,
  CollapsibleMinimalTrigger,
} from '@/components/ui/collapsible-minimal';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FixedSizeDialog,
  FixedSizeDialogActions,
  FixedSizeDialogContent,
  FixedSizeDialogTitle,
} from '@/components/ui/fixed-size-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatInitiativeDateRange, getInitiativeDateStatus } from '@/lib/date/initiative-dates';
import {
  formatInitiativeGoalsTabLabel,
  getDefaultInitiativeGoalsTab,
  getEmptyTabMessage,
  getOpenWorkSummary,
  partitionGoalsOpenCompleted,
  type InitiativeGoalsTab,
} from '@/lib/initiative/initiative-details-goals';
import { initiativeStatusBadge } from '@/lib/initiative/initiative-status-badge';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

export interface InitiativeDetailsDialogProps {
  initiative: Doc<'initiatives'> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (initiative: Doc<'initiatives'>) => void;
}

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

function isAdhocGoal(goal: Doc<'goals'>): boolean {
  return goal.adhoc !== undefined || goal.depth === -1;
}

function GoalListItem({
  goal,
  contextLabel,
  onClick,
}: {
  goal: Doc<'goals'>;
  contextLabel: string;
  onClick?: () => void;
}) {
  const content = (
    <>
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
    </>
  );

  if (onClick) {
    return (
      <li>
        <button
          type="button"
          onClick={onClick}
          className="w-full flex items-start gap-2 rounded-md px-2 py-2 hover:bg-accent/40 text-left"
        >
          {content}
        </button>
      </li>
    );
  }

  return <li className="flex items-start gap-2 rounded-md px-2 py-2">{content}</li>;
}

// fallow-ignore-next-line complexity
function GoalTabPanel({
  goals,
  emptyMessage,
  getContextLabel,
  onGoalClick,
}: {
  goals: Doc<'goals'>[];
  emptyMessage: string;
  getContextLabel: (goal: Doc<'goals'>) => string;
  onGoalClick: (goal: Doc<'goals'>) => void;
}) {
  if (goals.length === 0) {
    return <p className="px-4 py-8 text-sm text-center text-muted-foreground">{emptyMessage}</p>;
  }

  const { open, completed } = partitionGoalsOpenCompleted(goals);

  if (open.length === 0) {
    return <p className="px-4 py-8 text-sm text-center text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-1 overflow-y-auto px-2">
        {open.map((goal) => (
          <GoalListItem
            key={goal._id}
            goal={goal}
            contextLabel={getContextLabel(goal)}
            onClick={() => onGoalClick(goal)}
          />
        ))}
      </ul>
      {completed.length > 0 && (
        <div className="px-2 pb-2">
          <CollapsibleMinimal>
            <CollapsibleMinimalTrigger>
              {completed.length} completed goal{completed.length === 1 ? '' : 's'}
            </CollapsibleMinimalTrigger>
            <CollapsibleMinimalContent>
              <ul className="space-y-1">
                {completed.map((goal) => (
                  <GoalListItem
                    key={goal._id}
                    goal={goal}
                    contextLabel={getContextLabel(goal)}
                    onClick={() => onGoalClick(goal)}
                  />
                ))}
              </ul>
            </CollapsibleMinimalContent>
          </CollapsibleMinimal>
        </div>
      )}
    </div>
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
  const [activeTab, setActiveTab] = useState<InitiativeGoalsTab>('quarterly');
  const [selectedGoal, setSelectedGoal] = useState<Doc<'goals'> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (goalsByType) {
      setActiveTab(getDefaultInitiativeGoalsTab(goalsByType));
    }
  }, [open, initiative?._id, goalsByType]);

  const totalCount = useMemo(() => {
    if (!goalsByType) return 0;
    return (
      goalsByType.quarterly.length +
      goalsByType.weekly.length +
      goalsByType.daily.length +
      goalsByType.adhoc.length
    );
  }, [goalsByType]);

  const openWorkSummary = useMemo(() => {
    if (!goalsByType) return null;
    return getOpenWorkSummary(goalsByType);
  }, [goalsByType]);

  const titleCountLabel = useMemo(() => {
    if (!openWorkSummary) return null;
    if (openWorkSummary.totalOpen > 0) {
      return `${openWorkSummary.totalOpen} open`;
    }
    if (totalCount > 0) return `${totalCount} done`;
    return null;
  }, [openWorkSummary, totalCount]);

  if (!initiative) return null;

  const status = getInitiativeDateStatus(initiative.startDate, initiative.endDate);
  const badge = initiativeStatusBadge[status];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <FixedSizeDialog>
          <DialogHeader className="sr-only">
            <DialogTitle>{initiative.title}</DialogTitle>
          </DialogHeader>
          <FixedSizeDialogTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Flag className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">{initiative.title}</span>
              {titleCountLabel && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({titleCountLabel})
                </span>
              )}
            </div>
            <InitiativeActionMenu className="flex-shrink-0" onEdit={() => onEdit(initiative)} />
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
              {openWorkSummary && openWorkSummary.totalOpen > 0 && (
                <p className="text-xs text-muted-foreground">
                  {openWorkSummary.totalOpen} open goal{openWorkSummary.totalOpen === 1 ? '' : 's'}
                  {(openWorkSummary.openQuarterly > 0 || openWorkSummary.openAdhoc > 0) && (
                    <span>
                      {' '}
                      —{' '}
                      {[
                        openWorkSummary.openQuarterly > 0 &&
                          `${openWorkSummary.openQuarterly} quarterly`,
                        openWorkSummary.openAdhoc > 0 && `${openWorkSummary.openAdhoc} adhoc`,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  )}
                </p>
              )}
            </div>

            {goalsByType === undefined ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as InitiativeGoalsTab)}
                className="flex-1 flex flex-col min-h-0"
              >
                <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
                  <TabsTrigger value="quarterly">
                    {formatInitiativeGoalsTabLabel('quarterly', goalsByType.quarterly)}
                  </TabsTrigger>
                  <TabsTrigger value="weekly">
                    {formatInitiativeGoalsTabLabel('weekly', goalsByType.weekly)}
                  </TabsTrigger>
                  <TabsTrigger value="daily">
                    {formatInitiativeGoalsTabLabel('daily', goalsByType.daily)}
                  </TabsTrigger>
                  <TabsTrigger value="adhoc">
                    {formatInitiativeGoalsTabLabel('adhoc', goalsByType.adhoc)}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="quarterly" className="flex-1 mt-0 py-2 overflow-y-auto">
                  <GoalTabPanel
                    goals={goalsByType.quarterly}
                    emptyMessage={getEmptyTabMessage('quarterly', goalsByType.quarterly)}
                    getContextLabel={formatQuarterlyGoalLabel}
                    onGoalClick={setSelectedGoal}
                  />
                </TabsContent>
                <TabsContent value="weekly" className="flex-1 mt-0 py-2 overflow-y-auto">
                  <GoalTabPanel
                    goals={goalsByType.weekly}
                    emptyMessage={getEmptyTabMessage('weekly', goalsByType.weekly)}
                    getContextLabel={formatStructuredWeeklyLabel}
                    onGoalClick={setSelectedGoal}
                  />
                </TabsContent>
                <TabsContent value="daily" className="flex-1 mt-0 py-2 overflow-y-auto">
                  <GoalTabPanel
                    goals={goalsByType.daily}
                    emptyMessage={getEmptyTabMessage('daily', goalsByType.daily)}
                    getContextLabel={formatDailyGoalLabel}
                    onGoalClick={setSelectedGoal}
                  />
                </TabsContent>
                <TabsContent value="adhoc" className="flex-1 mt-0 py-2 overflow-y-auto">
                  <GoalTabPanel
                    goals={goalsByType.adhoc}
                    emptyMessage={getEmptyTabMessage('adhoc', goalsByType.adhoc)}
                    getContextLabel={formatAdhocGoalLabel}
                    onGoalClick={setSelectedGoal}
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

      <StandaloneGoalModal
        open={selectedGoal !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedGoal(null);
        }}
        goalId={selectedGoal?._id ?? null}
        goalCategory={selectedGoal && isAdhocGoal(selectedGoal) ? 'adhoc' : 'standard'}
        year={selectedGoal?.year ?? new Date().getFullYear()}
        quarter={(selectedGoal?.quarter ?? 1) as 1 | 2 | 3 | 4}
        weekNumber={selectedGoal?.adhoc?.weekNumber}
      />
    </>
  );
}
