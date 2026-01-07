import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { Check, CheckSquare, Square } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * Domain information for adhoc goal filtering.
 */
export interface Domain {
  /** Unique identifier for the domain */
  _id: Id<'domains'>;
  /** Display name of the domain */
  name: string;
  /** Optional color code for visual representation */
  color?: string;
}

/**
 * Goal counts per domain.
 */
export type DomainGoalCounts = Record<string, { total: number; completed: number }>;

/**
 * Props for the AdhocDomainSelector component.
 */
export interface AdhocDomainSelectorProps {
  /** List of available domains to select from */
  domains: Domain[];
  /** Currently selected domain IDs (can include 'UNCATEGORIZED' for uncategorized goals) */
  selectedDomainIds: (Id<'domains'> | 'UNCATEGORIZED')[];
  /** Callback fired when domain selection changes */
  onSelectionChange: (ids: (Id<'domains'> | 'UNCATEGORIZED')[]) => void;
  /** Goal counts per domain (optional) */
  goalCounts?: DomainGoalCounts;
  /** Optional CSS class name for custom styling */
  className?: string;
}

/**
 * Component for selecting domains to filter adhoc goals in quarterly reports.
 * Provides "Select All" and "Clear" buttons for bulk operations, and individual
 * checkboxes for each domain with color indicators.
 *
 * @example
 * ```tsx
 * <AdhocDomainSelector
 *   domains={domains}
 *   selectedDomainIds={selectedIds}
 *   onSelectionChange={setSelectedIds}
 *   goalCounts={counts}
 * />
 * ```
 */
export function AdhocDomainSelector({
  domains,
  selectedDomainIds,
  onSelectionChange,
  goalCounts,
  className,
}: AdhocDomainSelectorProps) {
  const hasInitializedSelection = React.useRef(false);

  // Auto-select non-empty domains on initial load
  React.useEffect(() => {
    if (
      domains &&
      goalCounts &&
      !hasInitializedSelection.current &&
      selectedDomainIds.length === 0
    ) {
      hasInitializedSelection.current = true;
      // Select all domains that have at least one goal
      const nonEmptyDomainIds: (Id<'domains'> | 'UNCATEGORIZED')[] = [];
      for (const domain of domains) {
        const count = goalCounts[domain._id];
        if (count && count.total > 0) {
          nonEmptyDomainIds.push(domain._id);
        }
      }
      // Check uncategorized
      const uncategorizedCount = goalCounts.UNCATEGORIZED;
      if (uncategorizedCount && uncategorizedCount.total > 0) {
        nonEmptyDomainIds.push('UNCATEGORIZED');
      }
      if (nonEmptyDomainIds.length > 0) {
        onSelectionChange(nonEmptyDomainIds);
      }
    }
  }, [domains, goalCounts, selectedDomainIds.length, onSelectionChange]);

  /**
   * Handles toggling a single domain's selection state.
   */
  const handleDomainToggle = React.useCallback(
    (domainId: Id<'domains'> | 'UNCATEGORIZED', checked: boolean) => {
      if (checked) {
        onSelectionChange([...selectedDomainIds, domainId]);
      } else {
        onSelectionChange(selectedDomainIds.filter((id) => id !== domainId));
      }
    },
    [selectedDomainIds, onSelectionChange]
  );

  /**
   * Selects all non-empty domains (those with at least 1 goal).
   */
  const handleSelectAll = React.useCallback(() => {
    if (domains && goalCounts) {
      const nonEmptyDomainIds: (Id<'domains'> | 'UNCATEGORIZED')[] = [];
      for (const domain of domains) {
        const count = goalCounts[domain._id];
        if (count && count.total > 0) {
          nonEmptyDomainIds.push(domain._id);
        }
      }
      const uncategorizedCount = goalCounts.UNCATEGORIZED;
      if (uncategorizedCount && uncategorizedCount.total > 0) {
        nonEmptyDomainIds.push('UNCATEGORIZED');
      }
      onSelectionChange(nonEmptyDomainIds);
    } else if (domains) {
      // Fallback if no counts available
      onSelectionChange([...domains.map((domain) => domain._id), 'UNCATEGORIZED']);
    }
  }, [domains, goalCounts, onSelectionChange]);

  /**
   * Clears all domain selections.
   */
  const handleDeselectAll = React.useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  /**
   * Determines if all non-empty domains are currently selected.
   */
  const isAllNonEmptySelected = React.useMemo(() => {
    if (!domains || !goalCounts) return false;
    const nonEmptyDomains = domains.filter((d) => {
      const count = goalCounts[d._id];
      return count && count.total > 0;
    });
    const uncategorizedCount = goalCounts.UNCATEGORIZED;
    const hasUncategorized = uncategorizedCount && uncategorizedCount.total > 0;

    const allDomainsSelected = nonEmptyDomains.every((d) => selectedDomainIds.includes(d._id));
    const uncategorizedSelected = !hasUncategorized || selectedDomainIds.includes('UNCATEGORIZED');

    return nonEmptyDomains.length > 0 && allDomainsSelected && uncategorizedSelected;
  }, [domains, goalCounts, selectedDomainIds]);

  /**
   * Determines if no domains are currently selected.
   */
  const isNoneSelected = React.useMemo(() => {
    return selectedDomainIds.length === 0;
  }, [selectedDomainIds]);

  // Count total non-empty domains
  const nonEmptyCount = React.useMemo(() => {
    if (!goalCounts || !domains) return 0;
    let count = 0;
    for (const domain of domains) {
      const domainCount = goalCounts[domain._id];
      if (domainCount && domainCount.total > 0) count++;
    }
    const uncategorizedCount = goalCounts.UNCATEGORIZED;
    if (uncategorizedCount && uncategorizedCount.total > 0) count++;
    return count;
  }, [domains, goalCounts]);

  if (!domains || domains.length === 0) {
    return null;
  }

  const totalOptions = domains.length + 1; // +1 for uncategorized

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Filter by Domain ({selectedDomainIds.length} of {totalOptions} selected)
          {goalCounts && nonEmptyCount > 0 && (
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
          const isSelected = selectedDomainIds.includes(domain._id);
          const count = goalCounts?.[domain._id];
          const hasGoals = count && count.total > 0;
          const allComplete = hasGoals && count.completed === count.total;

          return (
            <div
              key={domain._id}
              className={cn(
                'flex items-center space-x-3 p-3 rounded-lg border transition-colors',
                'hover:bg-accent/50 dark:hover:bg-accent/30',
                isSelected && 'bg-accent/30 dark:bg-accent/20 border-primary/30',
                !hasGoals && 'opacity-60'
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => handleDomainToggle(domain._id, checked === true)}
                className="flex-shrink-0"
                id={`domain-${domain._id}`}
              />
              <label
                htmlFor={`domain-${domain._id}`}
                className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2 flex-1"
              >
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
              </label>
            </div>
          );
        })}

        {/* Uncategorized option */}
        {(() => {
          const count = goalCounts?.UNCATEGORIZED;
          const hasGoals = count && count.total > 0;
          const allComplete = hasGoals && count.completed === count.total;
          const isSelected = selectedDomainIds.includes('UNCATEGORIZED');

          return (
            <div
              className={cn(
                'flex items-center space-x-3 p-3 rounded-lg border transition-colors',
                'hover:bg-accent/50 dark:hover:bg-accent/30',
                isSelected && 'bg-accent/30 dark:bg-accent/20 border-primary/30',
                !hasGoals && 'opacity-60'
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => handleDomainToggle('UNCATEGORIZED', checked === true)}
                className="flex-shrink-0"
                id="domain-uncategorized"
              />
              <label
                htmlFor="domain-uncategorized"
                className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2 flex-1 text-muted-foreground italic"
              >
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
              </label>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
