/**
 * Get Available Actions
 *
 * Pure function that determines which actions are available
 * for a given goal type. No framework dependencies.
 */

import { GoalActionId, GoalType, type GoalActionAvailability } from './types';

const actionsByGoalType: Record<GoalType, GoalActionId[]> = {
  [GoalType.Quarterly]: [
    GoalActionId.ViewFullDetails,
    GoalActionId.ViewSummary,
    GoalActionId.Edit,
    GoalActionId.MarkPending,
    GoalActionId.ToggleFireStatus,
    GoalActionId.Delete,
  ],
  [GoalType.Weekly]: [
    GoalActionId.ViewFullDetails,
    GoalActionId.MoveToWeek,
    GoalActionId.Edit,
    GoalActionId.MarkPending,
    GoalActionId.ToggleFireStatus,
    GoalActionId.Delete,
  ],
  [GoalType.Daily]: [
    GoalActionId.ViewFullDetails,
    GoalActionId.Edit,
    GoalActionId.MarkPending,
    GoalActionId.ToggleFireStatus,
    GoalActionId.Delete,
  ],
  [GoalType.Adhoc]: [
    GoalActionId.ViewFullDetails,
    GoalActionId.Edit,
    GoalActionId.MarkPending,
    GoalActionId.ToggleFireStatus,
    GoalActionId.ToggleBacklog,
    GoalActionId.Delete,
  ],
};

/**
 * Returns the ordered list of available actions for a given goal type.
 * Actions are returned in display order, grouped by category:
 * navigation → edit → status → danger
 */
export function getAvailableActions(goalType: GoalType): GoalActionAvailability[] {
  const available = actionsByGoalType[goalType];
  const allActions = Object.values(GoalActionId);

  return allActions.map((actionId) => ({
    actionId,
    available: available.includes(actionId),
  }));
}

/**
 * Returns only the action IDs that are available for a given goal type,
 * in display order.
 */
export function getAvailableActionIds(goalType: GoalType): GoalActionId[] {
  return actionsByGoalType[goalType];
}
