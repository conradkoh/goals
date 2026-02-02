import { describe, expect, it } from 'vitest';

import { fuzzySearch, type FuzzySearchConfig } from './useFuzzySearch';

interface TestItem {
  label: string;
  parentTitle?: string;
  domainName?: string;
}

describe('fuzzySearch', () => {
  const testItems: TestItem[] = [
    { label: 'Learn TypeScript', parentTitle: 'Technical Skills', domainName: 'Work' },
    { label: 'Exercise daily', parentTitle: 'Health Goals', domainName: 'Personal' },
    { label: 'Read books', parentTitle: 'Personal Development', domainName: 'Personal' },
    { label: 'Build side project', parentTitle: 'Technical Skills', domainName: 'Work' },
    { label: 'Weekly review', parentTitle: 'Productivity', domainName: 'Work' },
  ];

  const config: FuzzySearchConfig<TestItem> = {
    keys: ['label', 'parentTitle', 'domainName'],
    threshold: 0.4,
  };

  describe('basic matching', () => {
    it('should return all items when query is empty', () => {
      const result = fuzzySearch(testItems, '', config);
      expect(result).toHaveLength(testItems.length);
    });

    it('should return all items when query is whitespace only', () => {
      const result = fuzzySearch(testItems, '   ', config);
      expect(result).toHaveLength(testItems.length);
    });

    it('should match exact substring', () => {
      const result = fuzzySearch(testItems, 'TypeScript', config);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Learn TypeScript');
    });

    it('should match case-insensitively', () => {
      const result = fuzzySearch(testItems, 'typescript', config);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Learn TypeScript');
    });
  });

  describe('fuzzy matching', () => {
    it('should match partial words', () => {
      const result = fuzzySearch(testItems, 'exer', config);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((item) => item.label === 'Exercise daily')).toBe(true);
    });

    it('should match with minor typos', () => {
      // 'typscript' instead of 'typescript'
      const result = fuzzySearch(testItems, 'typscript', config);
      expect(result.some((item) => item.label === 'Learn TypeScript')).toBe(true);
    });

    it('should match subsequences (VSCode-style)', () => {
      // 'lts' should match 'Learn TypeScript'
      const result = fuzzySearch(testItems, 'lts', config);
      expect(result.some((item) => item.label === 'Learn TypeScript')).toBe(true);
    });
  });

  describe('multi-key matching', () => {
    it('should search across label field', () => {
      const result = fuzzySearch(testItems, 'Exercise', config);
      expect(result.some((item) => item.label === 'Exercise daily')).toBe(true);
    });

    it('should search across parentTitle field', () => {
      const result = fuzzySearch(testItems, 'Technical', config);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some((item) => item.parentTitle === 'Technical Skills')).toBe(true);
    });

    it('should search across domainName field', () => {
      const result = fuzzySearch(testItems, 'Personal', config);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some((item) => item.domainName === 'Personal')).toBe(true);
    });
  });

  describe('weighted keys', () => {
    const weightedConfig: FuzzySearchConfig<TestItem> = {
      keys: [
        { name: 'label', weight: 2 },
        { name: 'parentTitle', weight: 1 },
        { name: 'domainName', weight: 0.5 },
      ],
      threshold: 0.4,
    };

    it('should return matches from multiple weighted keys', () => {
      // Create items where the same word appears in different fields
      const items: TestItem[] = [
        { label: 'Work on project', parentTitle: 'Personal', domainName: 'Other' },
        { label: 'Personal task', parentTitle: 'Work', domainName: 'Other' },
      ];

      const result = fuzzySearch(items, 'Personal', weightedConfig);
      // Both items should match since 'Personal' appears in both
      expect(result.length).toBe(2);
      // Both items should be in results
      expect(result.some((item) => item.label === 'Personal task')).toBe(true);
      expect(result.some((item) => item.label === 'Work on project')).toBe(true);
    });

    it('should support weighted key configuration syntax', () => {
      const result = fuzzySearch(testItems, 'TypeScript', weightedConfig);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Learn TypeScript');
    });
  });

  describe('edge cases', () => {
    it('should handle empty items array', () => {
      const result = fuzzySearch([], 'test', config);
      expect(result).toHaveLength(0);
    });

    it('should handle items with undefined optional fields', () => {
      const itemsWithUndefined: TestItem[] = [
        { label: 'Simple item' },
        { label: 'Item with parent', parentTitle: 'Parent' },
      ];

      const result = fuzzySearch(itemsWithUndefined, 'Simple', config);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Simple item');
    });

    it('should handle special characters in query', () => {
      const itemsWithSpecialChars: TestItem[] = [
        { label: 'C++ programming' },
        { label: 'C# development' },
      ];

      const result = fuzzySearch(itemsWithSpecialChars, 'C++', config);
      expect(result.some((item) => item.label === 'C++ programming')).toBe(true);
    });

    it('should return empty array when no matches found', () => {
      const result = fuzzySearch(testItems, 'xyznonexistent', config);
      expect(result).toHaveLength(0);
    });
  });

  describe('threshold configuration', () => {
    it('should be more strict with lower threshold', () => {
      const strictConfig: FuzzySearchConfig<TestItem> = {
        keys: ['label'],
        threshold: 0.1, // Very strict
      };

      // Exact match should still work
      const exactResult = fuzzySearch(testItems, 'Exercise daily', strictConfig);
      expect(exactResult.some((item) => item.label === 'Exercise daily')).toBe(true);

      // Typo might not match with strict threshold
      const typoResult = fuzzySearch(testItems, 'Exrcise', strictConfig);
      // With strict threshold, typos are less likely to match
      expect(typoResult.length).toBeLessThanOrEqual(1);
    });

    it('should be more lenient with higher threshold', () => {
      const lenientConfig: FuzzySearchConfig<TestItem> = {
        keys: ['label'],
        threshold: 0.6, // More lenient
      };

      const result = fuzzySearch(testItems, 'exrcise', lenientConfig);
      expect(result.some((item) => item.label === 'Exercise daily')).toBe(true);
    });
  });
});
