import type { Id } from '@workspace/backend/convex/_generated/dataModel';

/**
 * Semantics for optional FK fields on goal updates:
 * - `undefined` → omit from mutation (no change)
 * - `null` → clear/unset the field
 * - `Id` → set to that value
 *
 * Mirrors backend `initiativeIdGoalPatch` in services/backend/src/util/goalInitiative.ts.
 */
export type OptionalIdUpdate<T extends string> = T | null | undefined;

export interface StructuredGoalSaveFields {
  title: string;
  details?: string;
  dueDate?: number;
  domainId?: OptionalIdUpdate<Id<'domains'>>;
  initiativeId?: OptionalIdUpdate<Id<'initiatives'>>;
}

export interface AdhocGoalSaveFields {
  title?: string;
  details?: string;
  dueDate?: number;
  domainId?: OptionalIdUpdate<Id<'domains'>>;
  initiativeId?: OptionalIdUpdate<Id<'initiatives'>>;
}
