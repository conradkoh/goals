import { describe, expect, it } from 'vitest';

import { resolveGoalType } from './resolveGoalType';
import { GoalType } from './types';

describe('resolveGoalType', () => {
  it('returns Quarterly for depth 0 without adhoc', () => {
    expect(resolveGoalType({ depth: 0 })).toBe(GoalType.Quarterly);
  });

  it('returns Weekly for depth 1 without adhoc', () => {
    expect(resolveGoalType({ depth: 1 })).toBe(GoalType.Weekly);
  });

  it('returns Daily for depth 2 without adhoc', () => {
    expect(resolveGoalType({ depth: 2 })).toBe(GoalType.Daily);
  });

  it('returns Adhoc when adhoc field is present', () => {
    expect(resolveGoalType({ depth: 0, adhoc: { weekNumber: 5 } })).toBe(GoalType.Adhoc);
  });

  it('returns Adhoc regardless of depth when adhoc is present', () => {
    expect(resolveGoalType({ depth: 1, adhoc: { weekNumber: 3 } })).toBe(GoalType.Adhoc);
    expect(resolveGoalType({ depth: 2, adhoc: { weekNumber: 1 } })).toBe(GoalType.Adhoc);
  });

  it('returns Daily for depth > 2 without adhoc', () => {
    expect(resolveGoalType({ depth: 3 })).toBe(GoalType.Daily);
  });
});
