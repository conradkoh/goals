import {
  domainIdStructuredMutationArg,
  initiativeIdStructuredMutationArg,
} from './optionalIdField';
import type { StructuredGoalSaveFields } from './types';

export function buildStructuredGoalMutationArgs(fields: StructuredGoalSaveFields) {
  return {
    title: fields.title,
    ...(fields.details !== undefined ? { details: fields.details } : {}),
    ...(fields.dueDate !== undefined ? { dueDate: fields.dueDate } : {}),
    ...domainIdStructuredMutationArg(fields.domainId),
    ...initiativeIdStructuredMutationArg(fields.initiativeId),
  };
}

/** Details-only auto-save for structured goals — omits domain/initiative so they are unchanged. */
export function buildStructuredDetailsOnlyArgs(
  goal: { title: string; dueDate?: number },
  newDetails: string
): StructuredGoalSaveFields {
  return { title: goal.title, details: newDetails, dueDate: goal.dueDate };
}
