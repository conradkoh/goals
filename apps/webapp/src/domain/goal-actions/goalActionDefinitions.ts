/**
 * Goal Action Definitions
 *
 * Metadata for each goal action including labels and categories.
 * Pure data — no framework dependencies.
 */

import { GoalActionId, type GoalActionDefinition, type GoalActionState } from './types';

export const goalActionDefinitions: Record<GoalActionId, GoalActionDefinition> = {
  [GoalActionId.ViewFullDetails]: {
    id: GoalActionId.ViewFullDetails,
    category: 'navigation',
    label: 'View Full Details',
  },
  [GoalActionId.ViewSummary]: {
    id: GoalActionId.ViewSummary,
    category: 'navigation',
    label: 'View Summary',
  },
  [GoalActionId.MoveToWeek]: {
    id: GoalActionId.MoveToWeek,
    category: 'navigation',
    label: 'Move to Week…',
  },
  [GoalActionId.Edit]: {
    id: GoalActionId.Edit,
    category: 'edit',
    label: 'Edit',
  },
  [GoalActionId.MarkPending]: {
    id: GoalActionId.MarkPending,
    category: 'status',
    label: (state: GoalActionState) => (state.isPending ? 'Update Pending' : 'Mark Pending'),
  },
  [GoalActionId.ToggleFireStatus]: {
    id: GoalActionId.ToggleFireStatus,
    category: 'status',
    label: (state: GoalActionState) => (state.isOnFire ? 'Remove Urgent' : 'Mark Urgent'),
  },
  [GoalActionId.ToggleBacklog]: {
    id: GoalActionId.ToggleBacklog,
    category: 'status',
    label: (state: GoalActionState) => (state.isBacklog ? 'Move to Active' : 'Move to Backlog'),
  },
  [GoalActionId.Delete]: {
    id: GoalActionId.Delete,
    category: 'danger',
    label: 'Delete',
  },
};

export function getActionLabel(actionId: GoalActionId, state: GoalActionState): string {
  const def = goalActionDefinitions[actionId];
  return typeof def.label === 'function' ? def.label(state) : def.label;
}
