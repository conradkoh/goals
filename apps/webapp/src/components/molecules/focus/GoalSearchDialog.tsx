import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { Calendar, Plus, Target } from 'lucide-react';
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
  /** Callback when a goal is selected */
  onGoalSelect: (goalId: Id<'goals'>, goal: GoalWithDetailsAndChildren) => void;
  /** Callback when "Jump to quarter" is selected */
  onJumpToQuarter?: () => void;
  /** Callback when "New Adhoc Goal" is selected */
  onNewAdhocGoal?: () => void;
  /** Whether a goal details modal is currently open (dims the search dialog) */
  isGoalModalOpen?: boolean;
}

/**
 * Internal type for a searchable goal item.
 *
 * @internal
 */
interface _GoalSearchItem {
  /** The goal object */
  goal: GoalWithDetailsAndChildren;
  /** Display label for the goal */
  label: string;
  /** Type of goal (weekly or daily) */
  type: 'weekly' | 'daily';
  /** Parent goal title for context */
  parentTitle?: string;
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
  onGoalSelect,
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
  const searchItems = useMemo((): _GoalSearchItem[] => {
    const items: _GoalSearchItem[] = [];

    // Create a map of quarterly goals for quick lookup
    const quarterlyMap = new Map(quarterlyGoals.map((q) => [q._id, q]));

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
        dayOfWeek: dayOfWeekName,
      });
    }

    return items;
  }, [weeklyGoals, dailyGoals, quarterlyGoals]);

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
      const dayMatch = item.dayOfWeek?.toLowerCase().includes(searchLower);
      return titleMatch || parentMatch || dayMatch;
    });
  }, [searchItems, searchValue]);

  /**
   * Groups filtered items by their goal type (weekly vs daily).
   *
   * @internal
   */
  const { weeklyItems, dailyItems } = useMemo(() => {
    const weekly = filteredItems.filter((item) => item.type === 'weekly');
    const daily = filteredItems.filter((item) => item.type === 'daily');
    return { weeklyItems: weekly, dailyItems: daily };
  }, [filteredItems]);

  /**
   * Handles selecting a goal from the search results.
   *
   * @internal
   */
  const handleSelect = useCallback(
    (item: _GoalSearchItem) => {
      onGoalSelect(item.goal._id, item.goal);
      // Keep the search dialog open to allow browsing multiple goals
    },
    [onGoalSelect]
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

        {/* Weekly Goals */}
        {weeklyItems.length > 0 && (
          <CommandGroup heading="Weekly Goals">
            {weeklyItems.map((item) => (
              <CommandItem
                key={`weekly-${item.goal._id}`}
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
                {item.goal.isComplete && (
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
                key={`daily-${item.goal._id}`}
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
                {item.goal.isComplete && (
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
