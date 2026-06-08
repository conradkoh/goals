/**
 * Goal Actions Domain Types
 *
 * Pure type definitions for the goal action system.
 * No React or framework dependencies.
 */

export enum GoalType {
  Quarterly = 'quarterly',
  Weekly = 'weekly',
  Daily = 'daily',
  Adhoc = 'adhoc',
}

export enum GoalActionId {
  ViewFullDetails = 'view_full_details',
  ViewSummary = 'view_summary',
  MoveToWeek = 'move_to_week',
  Edit = 'edit',
  MarkPending = 'mark_pending',
  ToggleFireStatus = 'toggle_fire_status',
  ToggleBacklog = 'toggle_backlog',
  Delete = 'delete',
}

export type GoalActionCategory = 'navigation' | 'edit' | 'status' | 'danger';

export interface GoalActionDefinition {
  id: GoalActionId;
  category: GoalActionCategory;
  label: string | ((state: GoalActionState) => string);
}

export interface GoalActionState {
  isOnFire: boolean;
  isPending: boolean;
  isBacklog: boolean;
  isComplete: boolean;
}

export interface GoalActionAvailability {
  actionId: GoalActionId;
  available: boolean;
}
