import type { AdhocGoalWithChildren } from '@workspace/backend/convex/adhocGoal';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { describe, expect, it } from 'vitest';

import {
  createGoalSearchConfig,
  createGoalSearchItem,
  fuzzySearchGoals,
  type GoalSearchItem,
} from './useGoalFuzzySearch';

// Mock goal structure - creates a minimal mock that satisfies the search requirements
// Uses `as unknown as` pattern for type testing with incomplete mock data
const createMockGoal = (overrides: {
  _id: string;
  title: string;
  parent?: { _id: string; title: string };
  depth?: number;
}): GoalWithDetailsAndChildren =>
  ({
    _id: overrides._id,
    title: overrides.title,
    depth: overrides.depth ?? 1,
    parent: overrides.parent ?? null,
    isCompleted: false,
    children: [],
  }) as unknown as GoalWithDetailsAndChildren;

// Mock adhoc goal structure
const createMockAdhocGoal = (overrides: {
  _id: string;
  title: string;
  domainName?: string;
}): AdhocGoalWithChildren =>
  ({
    _id: overrides._id,
    title: overrides.title,
    domainName: overrides.domainName,
    isCompleted: false,
    children: [],
  }) as unknown as AdhocGoalWithChildren;

describe('Goal Fuzzy Search Adapter', () => {
  describe('createGoalSearchItem', () => {
    it('should create a search item from a weekly goal', () => {
      const goal = createMockGoal({
        _id: 'goal1',
        title: 'Learn TypeScript',
        parent: { _id: 'quarterly1', title: 'Technical Skills' },
        depth: 1,
      });

      const item = createGoalSearchItem(goal, 'weekly');

      expect(item.label).toBe('Learn TypeScript');
      expect(item.type).toBe('weekly');
      expect(item.parentTitle).toBe('Technical Skills');
      expect(item.goal).toBe(goal);
    });

    it('should create a search item from a daily goal with day of week', () => {
      const goal = createMockGoal({
        _id: 'goal2',
        title: 'Morning exercise',
        parent: { _id: 'weekly1', title: 'Health routine' },
        depth: 2,
      });

      const item = createGoalSearchItem(goal, 'daily', {
        dayOfWeek: 'Monday',
        quarterlyTitle: 'Q1 Health Goals',
      });

      expect(item.label).toBe('Morning exercise');
      expect(item.type).toBe('daily');
      expect(item.parentTitle).toBe('Health routine');
      expect(item.dayOfWeek).toBe('Monday');
      expect(item.quarterlyTitle).toBe('Q1 Health Goals');
    });

    it('should create a search item from a quarterly goal', () => {
      const goal = createMockGoal({
        _id: 'goal3',
        title: 'Launch product',
        depth: 0,
      });

      const item = createGoalSearchItem(goal, 'quarterly');

      expect(item.label).toBe('Launch product');
      expect(item.type).toBe('quarterly');
      expect(item.parentTitle).toBeUndefined();
    });

    it('should create a search item from an adhoc goal', () => {
      const adhocGoal = createMockAdhocGoal({
        _id: 'adhoc1',
        title: 'Quick task',
        domainName: 'Personal',
      });

      const item = createGoalSearchItem(adhocGoal, 'adhoc', { domainName: 'Personal' });

      expect(item.label).toBe('Quick task');
      expect(item.type).toBe('adhoc');
      expect(item.domainName).toBe('Personal');
    });
  });

  describe('createGoalSearchConfig', () => {
    it('should create config with default threshold', () => {
      const config = createGoalSearchConfig();

      expect(config.threshold).toBe(0.4);
      expect(config.keys).toContainEqual({ name: 'label', weight: 2 });
      expect(config.keys).toContainEqual({ name: 'parentTitle', weight: 1 });
      expect(config.keys).toContainEqual({ name: 'domainName', weight: 0.5 });
    });

    it('should allow custom threshold', () => {
      const config = createGoalSearchConfig({ threshold: 0.6 });

      expect(config.threshold).toBe(0.6);
    });
  });

  describe('fuzzySearchGoals', () => {
    const searchItems: GoalSearchItem[] = [
      {
        label: 'Learn TypeScript',
        type: 'weekly',
        parentTitle: 'Technical Skills',
        goal: createMockGoal({ _id: '1', title: 'Learn TypeScript' }),
      },
      {
        label: 'Exercise daily',
        type: 'daily',
        parentTitle: 'Health routine',
        dayOfWeek: 'Monday',
        goal: createMockGoal({ _id: '2', title: 'Exercise daily' }),
      },
      {
        label: 'Review code',
        type: 'weekly',
        parentTitle: 'Technical Skills',
        goal: createMockGoal({ _id: '3', title: 'Review code' }),
      },
      {
        label: 'Quick meeting prep',
        type: 'adhoc',
        domainName: 'Work',
        adhocGoal: createMockAdhocGoal({ _id: '4', title: 'Quick meeting prep' }),
      },
      {
        label: 'Q1 Product Launch',
        type: 'quarterly',
        goal: createMockGoal({ _id: '5', title: 'Q1 Product Launch', depth: 0 }),
      },
    ];

    describe('basic search functionality', () => {
      it('should return all items when query is empty', () => {
        const result = fuzzySearchGoals(searchItems, '');
        expect(result).toHaveLength(searchItems.length);
      });

      it('should find goals by label', () => {
        const result = fuzzySearchGoals(searchItems, 'TypeScript');
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('Learn TypeScript');
      });

      it('should find goals by parent title', () => {
        const result = fuzzySearchGoals(searchItems, 'Technical');
        expect(result.length).toBeGreaterThanOrEqual(2);
        expect(result.every((item) => item.parentTitle === 'Technical Skills')).toBe(true);
      });

      it('should find adhoc goals by domain name', () => {
        const result = fuzzySearchGoals(searchItems, 'Work');
        expect(result.some((item) => item.type === 'adhoc' && item.domainName === 'Work')).toBe(
          true
        );
      });
    });

    describe('fuzzy matching for goals', () => {
      it('should match partial words', () => {
        const result = fuzzySearchGoals(searchItems, 'exer');
        expect(result.some((item) => item.label === 'Exercise daily')).toBe(true);
      });

      it('should match with typos', () => {
        const result = fuzzySearchGoals(searchItems, 'typscript');
        expect(result.some((item) => item.label === 'Learn TypeScript')).toBe(true);
      });

      it('should match day of week for daily goals', () => {
        const result = fuzzySearchGoals(searchItems, 'Monday');
        expect(result.some((item) => item.dayOfWeek === 'Monday')).toBe(true);
      });
    });

    describe('goal type filtering', () => {
      it('should find quarterly goals', () => {
        const result = fuzzySearchGoals(searchItems, 'Launch');
        expect(result.some((item) => item.type === 'quarterly')).toBe(true);
      });

      it('should find daily goals', () => {
        const result = fuzzySearchGoals(searchItems, 'Exercise');
        expect(result.some((item) => item.type === 'daily')).toBe(true);
      });

      it('should find weekly goals', () => {
        const result = fuzzySearchGoals(searchItems, 'Review');
        expect(result.some((item) => item.type === 'weekly')).toBe(true);
      });

      it('should find adhoc goals', () => {
        const result = fuzzySearchGoals(searchItems, 'meeting');
        expect(result.some((item) => item.type === 'adhoc')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty search items', () => {
        const result = fuzzySearchGoals([], 'test');
        expect(result).toHaveLength(0);
      });

      it('should return empty array when no matches found', () => {
        const result = fuzzySearchGoals(searchItems, 'xyznonexistent');
        expect(result).toHaveLength(0);
      });

      it('should handle items without optional fields', () => {
        const itemsWithoutOptional: GoalSearchItem[] = [
          {
            label: 'Simple goal',
            type: 'weekly',
            goal: createMockGoal({ _id: '1', title: 'Simple goal' }),
          },
        ];

        const result = fuzzySearchGoals(itemsWithoutOptional, 'Simple');
        expect(result).toHaveLength(1);
      });
    });
  });
});
