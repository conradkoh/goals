import Fuse, { type IFuseOptions } from 'fuse.js';
import { useMemo } from 'react';

/**
 * Configuration for fuzzy search
 */
export interface FuzzySearchConfig<T> {
  /** Keys to search on (with optional weights) */
  keys: (keyof T | { name: keyof T; weight: number })[];
  /** Match threshold: 0 = exact, 1 = match anything (default: 0.4) */
  threshold?: number;
  /** Minimum characters before matching starts (default: 1) */
  minMatchCharLength?: number;
}

/**
 * Result from fuzzy search with score and match info
 */
export interface FuzzySearchResult<T> {
  item: T;
  score: number;
  matches?: { key: string; indices: [number, number][] }[];
}

/**
 * Pure function for fuzzy search using Fuse.js
 *
 * @param items - Array of items to search through
 * @param query - Search query string
 * @param config - Search configuration
 * @returns Filtered and sorted array of matching items
 *
 * @example
 * const results = fuzzySearch(goals, 'typescript', {
 *   keys: ['label', 'parentTitle'],
 *   threshold: 0.4,
 * });
 */
export function fuzzySearch<T>(items: T[], query: string, config: FuzzySearchConfig<T>): T[] {
  // Return all items if query is empty or whitespace
  if (!query.trim()) {
    return items;
  }

  // Return empty if no items
  if (items.length === 0) {
    return [];
  }

  // Convert config keys to Fuse.js format
  const fuseKeys = config.keys.map((key) => {
    if (typeof key === 'object' && 'name' in key) {
      return { name: key.name as string, weight: key.weight };
    }
    return key as string;
  });

  const options: IFuseOptions<T> = {
    keys: fuseKeys,
    threshold: config.threshold ?? 0.4,
    minMatchCharLength: config.minMatchCharLength ?? 1,
    ignoreLocation: true, // Match anywhere in string
    includeScore: true,
    includeMatches: true,
    shouldSort: true,
  };

  const fuse = new Fuse(items, options);
  const results = fuse.search(query);

  return results.map((result) => result.item);
}

/**
 * React hook for fuzzy search with Fuse.js
 *
 * Creates a memoized Fuse instance and provides a search function.
 * The Fuse instance is recreated when items or config change.
 *
 * @param items - Array of items to search through
 * @param config - Search configuration
 * @returns Object containing the search function
 *
 * @example
 * const { search } = useFuzzySearch(goals, {
 *   keys: [
 *     { name: 'label', weight: 2 },
 *     { name: 'parentTitle', weight: 1 },
 *   ],
 *   threshold: 0.4,
 * });
 *
 * const filtered = useMemo(() => search(query), [search, query]);
 */
export function useFuzzySearch<T>(items: T[], config: FuzzySearchConfig<T>) {
  // Convert config keys to Fuse.js format
  const fuseKeys = useMemo(() => {
    return config.keys.map((key) => {
      if (typeof key === 'object' && 'name' in key) {
        return { name: key.name as string, weight: key.weight };
      }
      return key as string;
    });
  }, [config.keys]);

  // Memoize Fuse instance
  const fuse = useMemo(() => {
    const options: IFuseOptions<T> = {
      keys: fuseKeys,
      threshold: config.threshold ?? 0.4,
      minMatchCharLength: config.minMatchCharLength ?? 1,
      ignoreLocation: true,
      includeScore: true,
      includeMatches: true,
      shouldSort: true,
    };
    return new Fuse(items, options);
  }, [items, fuseKeys, config.threshold, config.minMatchCharLength]);

  // Memoize search function
  const search = useMemo(() => {
    return (query: string): T[] => {
      if (!query.trim()) {
        return items;
      }
      return fuse.search(query).map((result) => result.item);
    };
  }, [fuse, items]);

  return { search };
}
