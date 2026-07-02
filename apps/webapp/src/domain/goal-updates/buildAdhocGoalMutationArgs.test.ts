import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { describe, expect, it } from 'vitest';

import {
  buildAdhocDetailsOnlyArgs,
  buildAdhocGoalMutationArgs,
} from './buildAdhocGoalMutationArgs';

const DOMAIN_ID = 'domains:abc' as Id<'domains'>;
const INITIATIVE_ID = 'initiatives:xyz' as Id<'initiatives'>;

describe('buildAdhocGoalMutationArgs', () => {
  it('includes only provided fields', () => {
    expect(buildAdhocGoalMutationArgs({ details: 'New details' })).toEqual({
      details: 'New details',
    });
  });

  it('omits domainId and initiativeId when undefined', () => {
    const args = buildAdhocGoalMutationArgs({
      title: 'Task',
      domainId: undefined,
      initiativeId: undefined,
    });
    expect(args).toEqual({ title: 'Task' });
    expect(args).not.toHaveProperty('domainId');
    expect(args).not.toHaveProperty('initiativeId');
  });

  it('passes null to clear domain and initiative', () => {
    expect(
      buildAdhocGoalMutationArgs({
        title: 'Task',
        domainId: null,
        initiativeId: null,
      })
    ).toEqual({
      title: 'Task',
      domainId: null,
      initiativeId: null,
    });
  });

  it('sets domain and initiative when provided', () => {
    expect(
      buildAdhocGoalMutationArgs({
        title: 'Task',
        details: 'Notes',
        dueDate: 1_700_000_000_000,
        domainId: DOMAIN_ID,
        initiativeId: INITIATIVE_ID,
      })
    ).toEqual({
      title: 'Task',
      details: 'Notes',
      dueDate: 1_700_000_000_000,
      domainId: DOMAIN_ID,
      initiativeId: INITIATIVE_ID,
    });
  });
});

describe('buildAdhocDetailsOnlyArgs', () => {
  it('returns only details field', () => {
    expect(buildAdhocDetailsOnlyArgs('Updated markdown')).toEqual({
      details: 'Updated markdown',
    });
  });

  it('produces mutation args that do not touch domain or initiative', () => {
    const args = buildAdhocGoalMutationArgs(buildAdhocDetailsOnlyArgs('Checkbox toggled'));
    expect(args).toEqual({ details: 'Checkbox toggled' });
    expect(args).not.toHaveProperty('domainId');
    expect(args).not.toHaveProperty('initiativeId');
    expect(args).not.toHaveProperty('title');
  });
});
