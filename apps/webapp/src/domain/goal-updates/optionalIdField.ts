import type { Id } from '@workspace/backend/convex/_generated/dataModel';

import type { OptionalIdUpdate } from './types';

/** Structured goal mutations: null clears domain by omitting the field on the document. */
export function domainIdStructuredMutationArg(domainId: OptionalIdUpdate<Id<'domains'>>): {
  domainId?: Id<'domains'>;
} {
  if (domainId === undefined) return {};
  return { domainId: domainId === null ? undefined : domainId };
}

/** Structured goal mutations: null explicitly untags initiative (backend propagates). */
export function initiativeIdStructuredMutationArg(
  initiativeId: OptionalIdUpdate<Id<'initiatives'>>
): { initiativeId?: Id<'initiatives'> | null } {
  if (initiativeId === undefined) return {};
  return { initiativeId };
}

/** Adhoc goal mutations: null clears domain (Convex accepts null). */
export function domainIdAdhocMutationArg(domainId: OptionalIdUpdate<Id<'domains'>>): {
  domainId?: Id<'domains'> | null;
} {
  if (domainId === undefined) return {};
  return { domainId };
}

/** Adhoc goal mutations: null untags initiative (backend propagates). */
export function initiativeIdAdhocMutationArg(initiativeId: OptionalIdUpdate<Id<'initiatives'>>): {
  initiativeId?: Id<'initiatives'> | null;
} {
  if (initiativeId === undefined) return {};
  return { initiativeId };
}
