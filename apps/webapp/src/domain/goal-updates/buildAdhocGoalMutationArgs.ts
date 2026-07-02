import { domainIdAdhocMutationArg, initiativeIdAdhocMutationArg } from './optionalIdField';
import type { AdhocGoalSaveFields } from './types';

export function buildAdhocGoalMutationArgs(fields: AdhocGoalSaveFields) {
  const args: AdhocGoalSaveFields = {};
  if (fields.title !== undefined) args.title = fields.title;
  if (fields.details !== undefined) args.details = fields.details;
  if (fields.dueDate !== undefined) args.dueDate = fields.dueDate;
  return {
    ...args,
    ...domainIdAdhocMutationArg(fields.domainId),
    ...initiativeIdAdhocMutationArg(fields.initiativeId),
  };
}

/** Details-only auto-save for adhoc goals — omits all other fields so they are unchanged. */
export function buildAdhocDetailsOnlyArgs(
  newDetails: string
): Pick<AdhocGoalSaveFields, 'details'> {
  return { details: newDetails };
}
