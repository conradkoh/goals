import type { Id } from '@services/backend/convex/_generated/dataModel';
import { CheckSquare, Square } from 'lucide-react';
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
 * Props for the AdhocDomainSelector component.
 */
export interface AdhocDomainSelectorProps {
  /** List of available domains to select from */
  domains: Domain[];
  /** Currently selected domain IDs */
  selectedDomainIds: Id<'domains'>[];
  /** Callback fired when domain selection changes */
  onSelectionChange: (ids: Id<'domains'>[]) => void;
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
 * />
 * ```
 */
export function AdhocDomainSelector({
  domains,
  selectedDomainIds,
  onSelectionChange,
  className,
}: AdhocDomainSelectorProps) {
  /**
   * Handles toggling a single domain's selection state.
   */
  const handleDomainToggle = React.useCallback(
    (domainId: Id<'domains'>, checked: boolean) => {
      if (checked) {
        onSelectionChange([...selectedDomainIds, domainId]);
      } else {
        onSelectionChange(selectedDomainIds.filter((id) => id !== domainId));
      }
    },
    [selectedDomainIds, onSelectionChange]
  );

  /**
   * Selects all available domains.
   */
  const handleSelectAll = React.useCallback(() => {
    if (domains) {
      onSelectionChange(domains.map((domain) => domain._id));
    }
  }, [domains, onSelectionChange]);

  /**
   * Clears all domain selections.
   */
  const handleDeselectAll = React.useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  /**
   * Determines if all domains are currently selected.
   */
  const isAllSelected = React.useMemo(() => {
    return domains && domains.length > 0 && domains.every((d) => selectedDomainIds.includes(d._id));
  }, [domains, selectedDomainIds]);

  /**
   * Determines if no domains are currently selected.
   */
  const isNoneSelected = React.useMemo(() => {
    return selectedDomainIds.length === 0;
  }, [selectedDomainIds]);

  if (!domains || domains.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">
          Filter by Domain ({selectedDomainIds.length} of {domains.length} selected)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={isAllSelected}
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
          return (
            <div
              key={domain._id}
              className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
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
                    className="w-2.5 h-2.5 rounded-full ring-1 ring-inset ring-black/10"
                    style={{ backgroundColor: domain.color }}
                  />
                )}
                {domain.name}
              </label>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground bg-blue-50 text-blue-700 p-3 rounded-lg">
        Tip: If no domains are selected, all adhoc goals will be included.
      </p>
    </div>
  );
}
