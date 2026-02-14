import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import type { AdhocGoalWithChildren } from '@workspace/backend/convex/adhocGoal';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { useMemo } from 'react';

import { fuzzySearch, useFuzzySearch, type FuzzySearchConfig } from './useFuzzySearch';

/**
 * Represents a searchable goal item in the search dialog.
 * This is the unified structure for all goal types (weekly, daily, quarterly, adhoc).
 */
export interface GoalSearchItem {
  /** The goal object (for goal items) */
  goal?: GoalWithDetailsAndChildren;
  /** The adhoc goal object (for adhoc items) */
  adhocGoal?: AdhocGoalWithChildren;
  /** The domain object (for domain items) */
  domain?: Doc<'domains'> | null;
  /** Display label for the item */
  label: string;
  /** Type of item */
  type: 'weekly' | 'daily' | 'quarterly' | 'domain' | 'adhoc';
  /** Parent goal title for context */
  parentTitle?: string;
  /** Quarterly parent title for daily goals */
  quarterlyTitle?: string;
  /** Day of week for daily goals */
  dayOfWeek?: string;
  /** Domain name for adhoc goals */
  domainName?: string;
}

/**
 * Options for creating a goal search item
 */
interface GoalSearchItemOptions {
  /** Day of week for daily goals */
  dayOfWeek?: string;
  /** Quarterly parent title for daily goals */
  quarterlyTitle?: string;
  /** Domain name for adhoc goals */
  domainName?: string;
}

/**
 * Creates a searchable item from a goal or adhoc goal.
 *
 * @param goal - The goal or adhoc goal to create a search item from
 * @param type - The type of goal (weekly, daily, quarterly, adhoc)
 * @param options - Additional options for the search item
 * @returns A GoalSearchItem that can be used with fuzzy search
 *
 * @example
 * const item = createGoalSearchItem(weeklyGoal, 'weekly');
 * const dailyItem = createGoalSearchItem(dailyGoal, 'daily', {
 *   dayOfWeek: 'Monday',
 *   quarterlyTitle: 'Q1 Goals',
 * });
 */
export function createGoalSearchItem(
  goal: GoalWithDetailsAndChildren | AdhocGoalWithChildren | { title: string; _id: string },
  type: GoalSearchItem['type'],
  options: GoalSearchItemOptions = {}
): GoalSearchItem {
  const isAdhoc = type === 'adhoc';

  const item: GoalSearchItem = {
    label: goal.title,
    type,
    ...(options.dayOfWeek && { dayOfWeek: options.dayOfWeek }),
    ...(options.quarterlyTitle && { quarterlyTitle: options.quarterlyTitle }),
    ...(options.domainName && { domainName: options.domainName }),
  };

  // Get parent title from goal structure
  if (
    'parent' in goal &&
    goal.parent &&
    typeof goal.parent === 'object' &&
    'title' in goal.parent
  ) {
    item.parentTitle = (goal.parent as { title: string }).title;
  }

  // Attach the original goal or adhoc goal
  if (isAdhoc) {
    item.adhocGoal = goal as AdhocGoalWithChildren;
  } else {
    item.goal = goal as GoalWithDetailsAndChildren;
  }

  return item;
}

/**
 * Options for goal search configuration
 */
export interface GoalSearchConfigOptions {
  /** Match threshold: 0 = exact, 1 = match anything (default: 0.4) */
  threshold?: number;
  /** Minimum characters before matching starts (default: 1) */
  minMatchCharLength?: number;
}

/**
 * Creates the fuzzy search configuration for goal search.
 * Uses weighted keys to prioritize label matches over parent/domain matches.
 *
 * @param options - Configuration options
 * @returns A FuzzySearchConfig for GoalSearchItem
 *
 * @example
 * const config = createGoalSearchConfig({ threshold: 0.3 });
 */
export function createGoalSearchConfig(
  options: GoalSearchConfigOptions = {}
): FuzzySearchConfig<GoalSearchItem> {
  return {
    keys: [
      { name: 'label', weight: 2 }, // Goal title - highest priority
      { name: 'parentTitle', weight: 1 }, // Parent context
      { name: 'quarterlyTitle', weight: 1 }, // Quarterly parent
      { name: 'dayOfWeek', weight: 0.5 }, // Day of week
      { name: 'domainName', weight: 0.5 }, // Domain for adhoc
    ],
    threshold: options.threshold ?? 0.4,
    minMatchCharLength: options.minMatchCharLength ?? 1,
  };
}

// Default config for goal search
const DEFAULT_GOAL_SEARCH_CONFIG = createGoalSearchConfig();

/**
 * Pure function to perform fuzzy search on goal items.
 *
 * @param items - Array of GoalSearchItem to search through
 * @param query - Search query string
 * @param options - Optional configuration overrides
 * @returns Filtered and sorted array of matching items
 *
 * @example
 * const results = fuzzySearchGoals(searchItems, 'typescript');
 */
export function fuzzySearchGoals(
  items: GoalSearchItem[],
  query: string,
  options?: GoalSearchConfigOptions
): GoalSearchItem[] {
  const config = options ? createGoalSearchConfig(options) : DEFAULT_GOAL_SEARCH_CONFIG;
  return fuzzySearch(items, query, config);
}

/**
 * React hook for fuzzy searching goal items.
 * Provides a memoized search function for use in components.
 *
 * @param items - Array of GoalSearchItem to search through
 * @param options - Optional configuration overrides
 * @returns Object containing the search function
 *
 * @example
 * const { search } = useGoalFuzzySearch(searchItems);
 *
 * const filteredItems = useMemo(() => {
 *   return search(searchValue);
 * }, [search, searchValue]);
 */
export function useGoalFuzzySearch(items: GoalSearchItem[], options?: GoalSearchConfigOptions) {
  const config = useMemo(() => createGoalSearchConfig(options), [options]);
  return useFuzzySearch(items, config);
}
