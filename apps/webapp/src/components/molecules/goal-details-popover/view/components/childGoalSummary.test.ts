import { describe, expect, it } from 'vitest';

import { formatChildSummary } from './childGoalSummary';

describe('formatChildSummary', () => {
  it('uses the singular noun for a count of one', () => {
    expect(formatChildSummary({ count: 1, singular: 'weekly goal', plural: 'weekly goals' })).toBe(
      '1 weekly goal'
    );
  });

  it('uses the plural noun for a count greater than one', () => {
    expect(formatChildSummary({ count: 5, singular: 'weekly goal', plural: 'weekly goals' })).toBe(
      '5 weekly goals'
    );
  });

  it('formats daily goals', () => {
    expect(formatChildSummary({ count: 3, singular: 'daily goal', plural: 'daily goals' })).toBe(
      '3 daily goals'
    );
  });

  it('formats sub-tasks', () => {
    expect(formatChildSummary({ count: 4, singular: 'sub-task', plural: 'sub-tasks' })).toBe(
      '4 sub-tasks'
    );
  });

  it('joins the secondary phrase with a middle dot', () => {
    expect(
      formatChildSummary(
        { count: 5, singular: 'weekly goal', plural: 'weekly goals' },
        { count: 12, singular: 'daily goal', plural: 'daily goals' }
      )
    ).toBe('5 weekly goals · 12 daily goals');
  });

  it('omits a secondary phrase with a count of zero', () => {
    expect(
      formatChildSummary(
        { count: 5, singular: 'weekly goal', plural: 'weekly goals' },
        { count: 0, singular: 'daily goal', plural: 'daily goals' }
      )
    ).toBe('5 weekly goals');
  });

  it('uses singular nouns on both sides for single counts', () => {
    expect(
      formatChildSummary(
        { count: 1, singular: 'weekly goal', plural: 'weekly goals' },
        { count: 1, singular: 'daily goal', plural: 'daily goals' }
      )
    ).toBe('1 weekly goal · 1 daily goal');
  });
});
