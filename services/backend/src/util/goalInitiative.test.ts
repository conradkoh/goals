import { describe, expect, it } from 'vitest';

import { initiativeIdGoalPatch } from './goalInitiative';
import type { Id } from '../../convex/_generated/dataModel';

const INITIATIVE_ID = 'initiatives:xyz' as Id<'initiatives'>;

describe('initiativeIdGoalPatch', () => {
  it('returns empty patch when undefined (no change)', () => {
    expect(initiativeIdGoalPatch(undefined)).toEqual({});
  });

  it('clears initiativeId when null', () => {
    expect(initiativeIdGoalPatch(null)).toEqual({ initiativeId: undefined });
  });

  it('sets initiativeId when provided', () => {
    expect(initiativeIdGoalPatch(INITIATIVE_ID)).toEqual({ initiativeId: INITIATIVE_ID });
  });
});
