'use client';

import type { Id } from '@services/backend/convex/_generated/dataModel';
import { AlertCircle, Check, CheckSquare, ChevronDown, ChevronRight, Square } from 'lucide-react';
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useQuarterlySummaryContext } from './QuarterlySummaryContext';

/**
 * Panel component for selecting quarterly goals to include in the summary.
 * Displays goals with weekly goals prominently and empty goals in a collapsible section.
 * Provides select all/deselect all functionality for bulk operations.
 *
 * @example
 * ```tsx
 * <QuarterlyGoalSelectorPanel />
 * ```
 */
export function QuarterlyGoalSelectorPanel() {
  const {
    year,
    quarter,
    quarterlyGoals,
    selectedGoalIds,
    setSelectedGoalIds,
    isLoadingQuarterlyGoals,
  } = useQuarterlySummaryContext();

  const [isEmptyGoalsOpen, setIsEmptyGoalsOpen] = React.useState(false);

  const { goalsWithWeekly, emptyGoals } = React.useMemo(() => {
    if (!quarterlyGoals) return { goalsWithWeekly: [], emptyGoals: [] };
    return {
      goalsWithWeekly: quarterlyGoals.filter((g) => g.weeklyGoalCount > 0),
      emptyGoals: quarterlyGoals.filter((g) => g.weeklyGoalCount === 0),
    };
  }, [quarterlyGoals]);

  const handleGoalToggle = React.useCallback(
    (goalId: Id<'goals'>, checked: boolean) => {
      if (checked) {
        setSelectedGoalIds([...selectedGoalIds, goalId]);
      } else {
        setSelectedGoalIds(selectedGoalIds.filter((id) => id !== goalId));
      }
    },
    [selectedGoalIds, setSelectedGoalIds]
  );

  const handleSelectAll = React.useCallback(() => {
    if (quarterlyGoals) {
      const nonEmptyGoalIds = quarterlyGoals.filter((g) => g.weeklyGoalCount > 0).map((g) => g._id);
      setSelectedGoalIds(nonEmptyGoalIds);
    }
  }, [quarterlyGoals, setSelectedGoalIds]);

  const handleDeselectAll = React.useCallback(() => {
    setSelectedGoalIds([]);
  }, [setSelectedGoalIds]);

  const isAllNonEmptySelected = React.useMemo(() => {
    return (
      goalsWithWeekly.length > 0 &&
      goalsWithWeekly.every((goal) => selectedGoalIds.includes(goal._id))
    );
  }, [goalsWithWeekly, selectedGoalIds]);

  const isNoneSelected = selectedGoalIds.length === 0;

  if (isLoadingQuarterlyGoals) {
    return (
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground">Quarterly Goals</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Strategic high-level goals for the quarter
          </p>
        </div>
        <div className="p-6">
          <_QuarterlyGoalSelectorSkeleton />
        </div>
      </div>
    );
  }

  if (!quarterlyGoals) {
    return (
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground">Quarterly Goals</h2>
        </div>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load quarterly goals</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (quarterlyGoals.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground">Quarterly Goals</h2>
        </div>
        <div className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No quarterly goals found for Q{quarter} {year}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
      <div className="p-6 border-b bg-muted/30">
        <h2 className="text-lg font-semibold text-foreground">Quarterly Goals</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Strategic high-level goals for the quarter
        </p>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Select Goals ({selectedGoalIds.length} of {quarterlyGoals.length} selected)
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={isAllNonEmptySelected}
              className="flex items-center gap-1"
            >
              <CheckSquare className="h-4 w-4" />
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={isNoneSelected}
              className="flex items-center gap-1"
            >
              <Square className="h-4 w-4" />
              Deselect All
            </Button>
          </div>
        </div>

        {goalsWithWeekly.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto border rounded-lg p-3 bg-card">
            {goalsWithWeekly.map((goal) => {
              const isSelected = selectedGoalIds.includes(goal._id);
              const hasWeeklyGoals = goal.weeklyGoalCount > 0;
              const allWeeklyComplete =
                hasWeeklyGoals && goal.completedWeeklyGoalCount === goal.weeklyGoalCount;

              return (
                <label
                  key={goal._id}
                  htmlFor={`goal-${goal._id}`}
                  className={cn(
                    'flex items-start space-x-3 p-3 rounded-lg transition-colors cursor-pointer',
                    'hover:bg-accent/50 dark:hover:bg-accent/30',
                    isSelected && 'bg-accent/30 dark:bg-accent/20'
                  )}
                >
                  <Checkbox
                    id={`goal-${goal._id}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => handleGoalToggle(goal._id, checked === true)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'font-medium text-foreground',
                          goal.isComplete && 'line-through text-muted-foreground'
                        )}
                      >
                        {goal.title}
                      </span>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          allWeeklyComplete
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                        )}
                      >
                        {goal.completedWeeklyGoalCount}/{goal.weeklyGoalCount} weekly goals
                      </span>
                      {goal.isComplete && (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/50 px-2 py-0.5 rounded-full">
                          <Check className="h-3 w-3" />
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {emptyGoals.length > 0 && (
          <Collapsible open={isEmptyGoalsOpen} onOpenChange={setIsEmptyGoalsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-muted-foreground hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  {isEmptyGoalsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Empty Goals ({emptyGoals.length})
                </span>
                <span className="text-xs">No weekly goals assigned</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 border rounded-lg p-3 mt-2 bg-muted/30">
                {emptyGoals.map((goal) => {
                  const isSelected = selectedGoalIds.includes(goal._id);
                  return (
                    <label
                      key={goal._id}
                      htmlFor={`empty-goal-${goal._id}`}
                      className={cn(
                        'flex items-start space-x-3 p-3 rounded-lg transition-colors cursor-pointer',
                        'hover:bg-accent/50 dark:hover:bg-accent/30',
                        isSelected && 'bg-accent/30 dark:bg-accent/20'
                      )}
                    >
                      <Checkbox
                        id={`empty-goal-${goal._id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => handleGoalToggle(goal._id, checked === true)}
                        className="mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'font-medium text-foreground',
                              goal.isComplete && 'line-through text-muted-foreground'
                            )}
                          >
                            {goal.title}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            0/0 weekly goals
                          </span>
                          {goal.isComplete && (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/50 px-2 py-0.5 rounded-full">
                              <Check className="h-3 w-3" />
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

/**
 * Panel component for selecting domains to filter adhoc goals in the quarterly summary.
 * Displays all available domains with goal counts and completion status.
 * Includes an uncategorized option for goals without a domain.
 *
 * @example
 * ```tsx
 * <AdhocDomainSelectorPanel />
 * ```
 */
export function AdhocDomainSelectorPanel() {
  const { domains, selectedAdhocDomainIds, setSelectedAdhocDomainIds, adhocGoalCounts } =
    useQuarterlySummaryContext();

  const handleDomainToggle = React.useCallback(
    (domainId: Id<'domains'> | 'UNCATEGORIZED', checked: boolean) => {
      if (checked) {
        setSelectedAdhocDomainIds([...selectedAdhocDomainIds, domainId]);
      } else {
        setSelectedAdhocDomainIds(selectedAdhocDomainIds.filter((id) => id !== domainId));
      }
    },
    [selectedAdhocDomainIds, setSelectedAdhocDomainIds]
  );

  const handleSelectAll = React.useCallback(() => {
    if (domains && adhocGoalCounts) {
      const nonEmptyDomainIds: (Id<'domains'> | 'UNCATEGORIZED')[] = [];
      for (const domain of domains) {
        const count = adhocGoalCounts[domain._id];
        if (count && count.total > 0) {
          nonEmptyDomainIds.push(domain._id);
        }
      }
      const uncategorizedCount = adhocGoalCounts.UNCATEGORIZED;
      if (uncategorizedCount && uncategorizedCount.total > 0) {
        nonEmptyDomainIds.push('UNCATEGORIZED');
      }
      setSelectedAdhocDomainIds(nonEmptyDomainIds);
    } else if (domains) {
      setSelectedAdhocDomainIds([...domains.map((domain) => domain._id), 'UNCATEGORIZED']);
    }
  }, [domains, adhocGoalCounts, setSelectedAdhocDomainIds]);

  const handleDeselectAll = React.useCallback(() => {
    setSelectedAdhocDomainIds([]);
  }, [setSelectedAdhocDomainIds]);

  const isAllNonEmptySelected = React.useMemo(() => {
    if (!domains || !adhocGoalCounts) return false;
    const nonEmptyDomains = domains.filter((d) => {
      const count = adhocGoalCounts[d._id];
      return count && count.total > 0;
    });
    const uncategorizedCount = adhocGoalCounts.UNCATEGORIZED;
    const hasUncategorized = uncategorizedCount && uncategorizedCount.total > 0;

    const allDomainsSelected = nonEmptyDomains.every((d) => selectedAdhocDomainIds.includes(d._id));
    const uncategorizedSelected =
      !hasUncategorized || selectedAdhocDomainIds.includes('UNCATEGORIZED');

    return nonEmptyDomains.length > 0 && allDomainsSelected && uncategorizedSelected;
  }, [domains, adhocGoalCounts, selectedAdhocDomainIds]);

  const isNoneSelected = selectedAdhocDomainIds.length === 0;

  const nonEmptyCount = React.useMemo(() => {
    if (!adhocGoalCounts || !domains) return 0;
    let count = 0;
    for (const domain of domains) {
      const domainCount = adhocGoalCounts[domain._id];
      if (domainCount && domainCount.total > 0) count++;
    }
    const uncategorizedCount = adhocGoalCounts.UNCATEGORIZED;
    if (uncategorizedCount && uncategorizedCount.total > 0) count++;
    return count;
  }, [domains, adhocGoalCounts]);

  if (!domains || domains.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground">Adhoc Goals</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tactical tasks and smaller wins - select domains to include
          </p>
        </div>
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            No domains available. Adhoc goals are organized by domains.
          </p>
        </div>
      </div>
    );
  }

  const totalOptions = domains.length + 1;

  return (
    <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
      <div className="p-6 border-b bg-muted/30">
        <h2 className="text-lg font-semibold text-foreground">Adhoc Goals</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tactical tasks and smaller wins - select domains to include
        </p>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            Filter by Domain ({selectedAdhocDomainIds.length} of {totalOptions} selected)
            {adhocGoalCounts && nonEmptyCount > 0 && (
              <span className="text-muted-foreground ml-1">({nonEmptyCount} with goals)</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={isAllNonEmptySelected}
              className="flex items-center gap-1"
            >
              <CheckSquare className="h-4 w-4" />
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={isNoneSelected}
              className="flex items-center gap-1"
            >
              <Square className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {domains.map((domain) => {
            const isSelected = selectedAdhocDomainIds.includes(domain._id);
            const count = adhocGoalCounts?.[domain._id];
            const hasGoals = count && count.total > 0;
            const allComplete = hasGoals && count.completed === count.total;

            return (
              <label
                key={domain._id}
                htmlFor={`domain-${domain._id}`}
                className={cn(
                  'flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer',
                  'hover:bg-accent/50 dark:hover:bg-accent/30',
                  isSelected && 'bg-accent/30 dark:bg-accent/20 border-primary/30',
                  !hasGoals && 'opacity-60'
                )}
              >
                <Checkbox
                  id={`domain-${domain._id}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => handleDomainToggle(domain._id, checked === true)}
                  className="flex-shrink-0"
                />
                <span className="text-sm font-medium leading-none flex items-center gap-2 flex-1">
                  {domain.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10"
                      style={{ backgroundColor: domain.color }}
                    />
                  )}
                  <span className="text-foreground">{domain.name}</span>
                  {count && (
                    <span
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded-full ml-auto',
                        allComplete
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                          : hasGoals
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {allComplete && <Check className="h-3 w-3 inline mr-0.5" />}
                      {count.completed}/{count.total}
                    </span>
                  )}
                </span>
              </label>
            );
          })}

          {/* Uncategorized option */}
          {(() => {
            const count = adhocGoalCounts?.UNCATEGORIZED;
            const hasGoals = count && count.total > 0;
            const allComplete = hasGoals && count.completed === count.total;
            const isSelected = selectedAdhocDomainIds.includes('UNCATEGORIZED');

            return (
              <label
                htmlFor="domain-uncategorized"
                className={cn(
                  'flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer',
                  'hover:bg-accent/50 dark:hover:bg-accent/30',
                  isSelected && 'bg-accent/30 dark:bg-accent/20 border-primary/30',
                  !hasGoals && 'opacity-60'
                )}
              >
                <Checkbox
                  id="domain-uncategorized"
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    handleDomainToggle('UNCATEGORIZED', checked === true)
                  }
                  className="flex-shrink-0"
                />
                <span className="text-sm font-medium leading-none flex items-center gap-2 flex-1 text-muted-foreground italic">
                  Uncategorized
                  {count && (
                    <span
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded-full ml-auto not-italic',
                        allComplete
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                          : hasGoals
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {allComplete && <Check className="h-3 w-3 inline mr-0.5" />}
                      {count.completed}/{count.total}
                    </span>
                  )}
                </span>
              </label>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader displayed while quarterly goals are loading.
 */
function _QuarterlyGoalSelectorSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loading items don't need unique keys
        <div key={i} className="flex items-center space-x-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
