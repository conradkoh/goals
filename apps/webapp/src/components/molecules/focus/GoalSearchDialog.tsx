import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { Calendar, Folder, Plus, Target } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

/**
 * Props for the GoalSearchDialog component.
 *
 * @public
 *
 * @example
 * ```typescript
 * <GoalSearchDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   weeklyGoals={weeklyGoals}
 *   dailyGoals={dailyGoals}
 *   quarterlyGoals={quarterlyGoals}
 *   onGoalSelect={(id, goal) => console.log('Selected:', goal)}
 * />
 * ```
 */
export interface GoalSearchDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Weekly goals to search through */
  weeklyGoals: GoalWithDetailsAndChildren[];
  /** Daily goals to search through */
  dailyGoals: GoalWithDetailsAndChildren[];
  /** Quarterly goals for reference (to show parent context) */
  quarterlyGoals: GoalWithDetailsAndChildren[];
  /** Available domains to search through */
  domains?: Doc<'domains'>[];
  /** Callback when a goal is selected */
  onGoalSelect: (goalId: Id<'goals'>, goal: GoalWithDetailsAndChildren) => void;
  /** Callback when a domain is selected */
  onDomainSelect?: (domain: Doc<'domains'> | null) => void;
  /** Callback when "Jump to quarter" is selected */
  onJumpToQuarter?: () => void;
  /** Callback when "New Adhoc Goal" is selected */
  onNewAdhocGoal?: () => void;
  /** Whether a goal details modal is currently open (dims the search dialog) */
  isGoalModalOpen?: boolean;
}

/**
 * Internal type for a searchable item (goal or domain).
 *
 * @internal
 */
interface _SearchItem {
  /** The goal object (for goal items) */
  goal?: GoalWithDetailsAndChildren;
  /** The domain object (for domain items) */
  domain?: Doc<'domains'> | null;
  /** Display label for the item */
  label: string;
  /** Type of item */
  type: 'weekly' | 'daily' | 'quarterly' | 'domain';
  /** Parent goal title for context */
  parentTitle?: string;
  /** Quarterly parent title for daily goals */
  quarterlyTitle?: string;
  /** Day of week for daily goals */
  dayOfWeek?: string;
}

/**
 * Names of the days of the week for display context.
 *
 * @internal
 */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Dialog for searching and jumping to weekly and daily goals.
 * Opened via Cmd+K keyboard shortcut in weekly/daily views.
 * Shows weekly goals and daily goals with their parent context.
 *
 * The dialog remains open when a goal is selected, allowing users to:
 * - View multiple goal details sequentially
 * - Reference information from different goals
 * - Navigate back and forth between search and goal details
 *
 * Press Escape once to close the goal details modal (if open)
 * Press Escape again to close the search dialog
 *
 * @public
 *
 * @param props - Component props
 * @returns Rendered search dialog component
 */
export function GoalSearchDialog({
  open,
  onOpenChange,
  weeklyGoals,
  dailyGoals,
  quarterlyGoals,
  domains = [],
  onGoalSelect,
  onDomainSelect,
  onJumpToQuarter,
  onNewAdhocGoal,
  isGoalModalOpen = false,
}: GoalSearchDialogProps) {
  const [searchValue, setSearchValue] = useState('');

  /**
   * Builds searchable items from weekly and daily goals with parent context.
   *
   * @internal
   */
  const searchItems = useMemo((): _SearchItem[] => {
    const items: _SearchItem[] = [];

    // Create a map of quarterly goals for quick lookup
    const quarterlyMap = new Map(quarterlyGoals.map((q) => [q._id, q]));

    // Add quarterly goals
    for (const quarterlyGoal of quarterlyGoals) {
      items.push({
        goal: quarterlyGoal,
        label: quarterlyGoal.title,
        type: 'quarterly',
      });
    }

    // Add weekly goals
    for (const weeklyGoal of weeklyGoals) {
      const parentGoal = weeklyGoal.parentId ? quarterlyMap.get(weeklyGoal.parentId) : undefined;
      items.push({
        goal: weeklyGoal,
        label: weeklyGoal.title,
        type: 'weekly',
        parentTitle: parentGoal?.title,
      });
    }

    // Add daily goals
    for (const dailyGoal of dailyGoals) {
      const parentWeeklyGoal = weeklyGoals.find((w) => w._id === dailyGoal.parentId);
      const quarterlyParentGoal = parentWeeklyGoal?.parentId
        ? quarterlyMap.get(parentWeeklyGoal.parentId)
        : undefined;
      const dayOfWeekNum = dailyGoal.state?.daily?.dayOfWeek;
      const dayOfWeekName =
        dayOfWeekNum !== undefined && dayOfWeekNum >= 0 && dayOfWeekNum <= 6
          ? DAY_NAMES[dayOfWeekNum]
          : undefined;

      items.push({
        goal: dailyGoal,
        label: dailyGoal.title,
        type: 'daily',
        parentTitle: parentWeeklyGoal?.title,
        quarterlyTitle: quarterlyParentGoal?.title,
        dayOfWeek: dayOfWeekName,
      });
    }

    // Add domains
    for (const domain of domains) {
      items.push({
        domain,
        label: domain.name,
        type: 'domain',
      });
    }

    // Add "Uncategorized" domain
    items.push({
      domain: null,
      label: 'Uncategorized',
      type: 'domain',
    });

    return items;
  }, [weeklyGoals, dailyGoals, quarterlyGoals, domains]);

  /**
   * Filters items based on search input value.
   *
   * @internal
   */
  const filteredItems = useMemo(() => {
    if (!searchValue.trim()) {
      return searchItems;
    }

    const searchLower = searchValue.toLowerCase();
    return searchItems.filter((item) => {
      const titleMatch = item.label.toLowerCase().includes(searchLower);
      const parentMatch = item.parentTitle?.toLowerCase().includes(searchLower);
      const quarterlyMatch = item.quarterlyTitle?.toLowerCase().includes(searchLower);
      const dayMatch = item.dayOfWeek?.toLowerCase().includes(searchLower);
      return titleMatch || parentMatch || quarterlyMatch || dayMatch;
    });
  }, [searchItems, searchValue]);

  /**
   * Groups filtered items by their type (domains, quarterly, weekly, and daily).
   *
   * @internal
   */
  const { domainItems, quarterlyItems, weeklyItems, dailyItems } = useMemo(() => {
    const domains = filteredItems.filter((item) => item.type === 'domain');
    const quarterly = filteredItems.filter((item) => item.type === 'quarterly');
    const weekly = filteredItems.filter((item) => item.type === 'weekly');
    const daily = filteredItems.filter((item) => item.type === 'daily');
    return {
      domainItems: domains,
      quarterlyItems: quarterly,
      weeklyItems: weekly,
      dailyItems: daily,
    };
  }, [filteredItems]);

  /**
   * Handles selecting an item from the search results.
   *
   * @internal
   */
  const handleSelect = useCallback(
    (item: _SearchItem) => {
      if (item.type === 'domain') {
        // Close dialog and trigger domain selection
        onOpenChange(false);
        onDomainSelect?.(item.domain ?? null);
      } else if (item.goal) {
        onGoalSelect(item.goal._id, item.goal);
        // Keep the search dialog open to allow browsing multiple goals
      }
    },
    [onGoalSelect, onDomainSelect, onOpenChange]
  );

  /**
   * Handles selecting the "Jump to Quarter" action.
   *
   * @internal
   */
  const handleJumpToQuarterClick = useCallback(() => {
    onOpenChange(false);
    onJumpToQuarter?.();
  }, [onOpenChange, onJumpToQuarter]);

  /**
   * Handles selecting the "New Adhoc Goal" action.
   *
   * @internal
   */
  const handleNewAdhocGoalClick = useCallback(() => {
    onOpenChange(false);
    onNewAdhocGoal?.();
  }, [onOpenChange, onNewAdhocGoal]);

  /**
   * Handles search value changes.
   *
   * @internal
   */
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      className={isGoalModalOpen ? 'opacity-50 pointer-events-auto' : ''}
    >
      <CommandInput
        placeholder="Search goals or jump to quarter..."
        value={searchValue}
        onValueChange={handleSearchChange}
      />
      <CommandList>
        <CommandEmpty>No goals found.</CommandEmpty>

        {/* Show Navigation Group */}
        {(onJumpToQuarter || onNewAdhocGoal) && (
          <CommandGroup heading="Navigation">
            {onNewAdhocGoal && (
              <CommandItem
                value="new-adhoc-goal"
                onSelect={handleNewAdhocGoalClick}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Adhoc Goal</span>
              </CommandItem>
            )}
            {onJumpToQuarter && (
              <CommandItem
                value="jump-to-quarter"
                onSelect={handleJumpToQuarterClick}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                <span>Jump to quarter...</span>
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {/* Domains */}
        {domainItems.length > 0 && (
          <CommandGroup heading="Domains">
            {domainItems.map((item) => {
              const domainId = item.domain?._id ?? 'uncategorized';
              return (
                <CommandItem
                  key={`domain-${domainId}`}
                  value={`domain-${item.label}`}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-2"
                >
                  <Folder className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Quarterly Goals */}
        {quarterlyItems.length > 0 && (
          <CommandGroup heading="Quarterly Goals">
            {quarterlyItems.map((item) => (
              <CommandItem
                key={`quarterly-${item.goal?._id}`}
                value={`quarterly-${item.label}`}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate">{item.label}</span>
                </div>
                {item.goal?.isComplete && (
                  <span className="ml-auto text-xs text-green-600 dark:text-green-400">✓</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Weekly Goals */}
        {weeklyItems.length > 0 && (
          <CommandGroup heading="Weekly Goals">
            {weeklyItems.map((item) => (
              <CommandItem
                key={`weekly-${item.goal?._id}`}
                value={`weekly-${item.label}`}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.parentTitle && (
                    <span className="text-xs text-muted-foreground truncate">
                      {item.parentTitle}
                    </span>
                  )}
                </div>
                {item.goal?.isComplete && (
                  <span className="ml-auto text-xs text-green-600 dark:text-green-400">✓</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Daily Goals */}
        {dailyItems.length > 0 && (
          <CommandGroup heading="Daily Goals">
            {dailyItems.map((item) => (
              <CommandItem
                key={`daily-${item.goal?._id}`}
                value={`daily-${item.label}`}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.dayOfWeek && (
                      <span className="text-xs text-muted-foreground">{item.dayOfWeek}</span>
                    )}
                    {item.parentTitle && (
                      <span className="text-xs text-muted-foreground truncate">
                        • {item.parentTitle}
                      </span>
                    )}
                  </div>
                </div>
                {item.goal?.isComplete && (
                  <span className="ml-auto text-xs text-green-600 dark:text-green-400">✓</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
