import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { describe, expect, it } from 'vitest';

import {
  domainIdAdhocMutationArg,
  domainIdStructuredMutationArg,
  initiativeIdAdhocMutationArg,
  initiativeIdStructuredMutationArg,
} from './optionalIdField';

const DOMAIN_ID = 'domains:abc' as Id<'domains'>;
const INITIATIVE_ID = 'initiatives:xyz' as Id<'initiatives'>;

describe('domainIdStructuredMutationArg', () => {
  it('returns empty object when undefined (no change)', () => {
    expect(domainIdStructuredMutationArg(undefined)).toEqual({});
  });

  it('returns undefined domainId when null (clear)', () => {
    expect(domainIdStructuredMutationArg(null)).toEqual({ domainId: undefined });
  });

  it('returns the id when set', () => {
    expect(domainIdStructuredMutationArg(DOMAIN_ID)).toEqual({ domainId: DOMAIN_ID });
  });
});

describe('initiativeIdStructuredMutationArg', () => {
  it('returns empty object when undefined (no change)', () => {
    expect(initiativeIdStructuredMutationArg(undefined)).toEqual({});
  });

  it('returns null when clearing initiative', () => {
    expect(initiativeIdStructuredMutationArg(null)).toEqual({ initiativeId: null });
  });

  it('returns the id when set', () => {
    expect(initiativeIdStructuredMutationArg(INITIATIVE_ID)).toEqual({
      initiativeId: INITIATIVE_ID,
    });
  });
});

describe('domainIdAdhocMutationArg', () => {
  it('returns empty object when undefined (no change)', () => {
    expect(domainIdAdhocMutationArg(undefined)).toEqual({});
  });

  it('returns null when clearing domain', () => {
    expect(domainIdAdhocMutationArg(null)).toEqual({ domainId: null });
  });

  it('returns the id when set', () => {
    expect(domainIdAdhocMutationArg(DOMAIN_ID)).toEqual({ domainId: DOMAIN_ID });
  });
});

describe('initiativeIdAdhocMutationArg', () => {
  it('returns empty object when undefined (no change)', () => {
    expect(initiativeIdAdhocMutationArg(undefined)).toEqual({});
  });

  it('returns null when clearing initiative', () => {
    expect(initiativeIdAdhocMutationArg(null)).toEqual({ initiativeId: null });
  });

  it('returns the id when set', () => {
    expect(initiativeIdAdhocMutationArg(INITIATIVE_ID)).toEqual({
      initiativeId: INITIATIVE_ID,
    });
  });
});
