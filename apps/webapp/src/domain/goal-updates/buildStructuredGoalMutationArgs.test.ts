import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { describe, expect, it } from 'vitest';

import {
  buildStructuredDetailsOnlyArgs,
  buildStructuredGoalMutationArgs,
} from './buildStructuredGoalMutationArgs';

const DOMAIN_ID = 'domains:abc' as Id<'domains'>;
const INITIATIVE_ID = 'initiatives:xyz' as Id<'initiatives'>;

describe('buildStructuredGoalMutationArgs', () => {
  it('includes only provided optional fields', () => {
    expect(
      buildStructuredGoalMutationArgs({
        title: 'Goal',
        details: 'Details',
        dueDate: 1_700_000_000_000,
      })
    ).toEqual({
      title: 'Goal',
      details: 'Details',
      dueDate: 1_700_000_000_000,
    });
  });

  it('omits domainId and initiativeId when undefined', () => {
    const args = buildStructuredGoalMutationArgs({
      title: 'Goal',
      domainId: undefined,
      initiativeId: undefined,
    });
    expect(args).toEqual({ title: 'Goal' });
    expect(args).not.toHaveProperty('domainId');
    expect(args).not.toHaveProperty('initiativeId');
  });

  it('passes null initiativeId to untag', () => {
    expect(
      buildStructuredGoalMutationArgs({
        title: 'Goal',
        initiativeId: null,
      })
    ).toEqual({ title: 'Goal', initiativeId: null });
  });

  it('clears domainId by sending undefined', () => {
    expect(
      buildStructuredGoalMutationArgs({
        title: 'Goal',
        domainId: null,
      })
    ).toEqual({ title: 'Goal', domainId: undefined });
  });

  it('sets domain and initiative when provided', () => {
    expect(
      buildStructuredGoalMutationArgs({
        title: 'Goal',
        domainId: DOMAIN_ID,
        initiativeId: INITIATIVE_ID,
      })
    ).toEqual({
      title: 'Goal',
      domainId: DOMAIN_ID,
      initiativeId: INITIATIVE_ID,
    });
  });
});

describe('buildStructuredDetailsOnlyArgs', () => {
  it('returns title, new details, and dueDate without domain or initiative', () => {
    const goal = { title: 'My Goal', dueDate: 1_700_000_000_000 };
    expect(buildStructuredDetailsOnlyArgs(goal, 'Updated details')).toEqual({
      title: 'My Goal',
      details: 'Updated details',
      dueDate: 1_700_000_000_000,
    });
  });

  it('produces mutation args that omit initiative and domain', () => {
    const goal = { title: 'My Goal', dueDate: 1_700_000_000_000, initiativeId: INITIATIVE_ID };
    const fields = buildStructuredDetailsOnlyArgs(goal, 'New');
    const args = buildStructuredGoalMutationArgs(fields);
    expect(args).toEqual({
      title: 'My Goal',
      details: 'New',
      dueDate: 1_700_000_000_000,
    });
    expect(args).not.toHaveProperty('initiativeId');
    expect(args).not.toHaveProperty('domainId');
  });
});
