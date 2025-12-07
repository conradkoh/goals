import type { Id } from '@services/backend/convex/_generated/dataModel';

/**
 * Handler for updating a goal's title, details, and due date.
 * This is the primary update handler used across all goal components.
 *
 * @param goalId - The ID of the goal to update
 * @param title - The new title for the goal
 * @param details - Optional rich text details/description (undefined clears details)
 * @param dueDate - Required parameter for due date as Unix timestamp (undefined clears due date)
 *
 * @example
 * const handleUpdate: GoalUpdateHandler = async (goalId, title, details, dueDate) => {
 *   await updateQuarterlyGoalTitle({ goalId, title, details, dueDate });
 * };
 */
export type GoalUpdateHandler = (
  goalId: Id<'goals'>,
  title: string,
  details: string | undefined,
  dueDate: number | undefined,
  domainId?: Id<'domains'> | null
) => Promise<void>;

/**
 * Simplified update handler that doesn't require a goal ID.
 * Used in contexts where the goal is already known (e.g., modal editing).
 *
 * @param title - The new title for the goal
 * @param details - Optional rich text details/description (undefined clears details)
 * @param dueDate - Required parameter for due date as Unix timestamp (undefined clears due date)
 */
export type GoalSaveHandler = (
  title: string,
  details: string | undefined,
  dueDate: number | undefined,
  domainId?: Id<'domains'> | null
) => Promise<void>;

/**
 * Handler for toggling goal completion status.
 *
 * @param isComplete - Whether the goal should be marked as complete
 */
export type GoalCompletionHandler = (isComplete: boolean) => Promise<void>;

/**
 * Handler for deleting a goal.
 *
 * @param goalId - The ID of the goal to delete
 */
export type GoalDeleteHandler = (goalId: Id<'goals'>) => Promise<void>;

/**
 * Standard props for components that display and allow editing of goal details.
 * Use this interface for modals, popovers, and inline editors.
 */
export interface GoalDetailsHandlers {
  /** Handler called when the user saves changes to the goal */
  onSave: GoalSaveHandler;

  /** Optional handler for toggling goal completion */
  onToggleComplete?: GoalCompletionHandler;
}

/**
 * Handler for tracking pending updates.
 * Called when an update starts, receives the promise to track.
 * The goal list item shows a loading indicator until the promise resolves.
 *
 * @example
 * const handleSave = async () => {
 *   const updatePromise = onSave(title, details, dueDate);
 *   onUpdatePending?.(updatePromise);
 *   await updatePromise;
 * };
 */
export type GoalUpdatePendingHandler = (updatePromise: Promise<void>) => void;

/**
 * Standard props for components in a list view that need CRUD operations.
 * Use this interface for list items, cards, and similar components.
 */
export interface GoalListItemHandlers {
  /** Handler for updating goal properties */
  onUpdateGoal: GoalUpdateHandler;

  /** Handler for tracking pending updates - shows loading indicator */
  onUpdatePending?: GoalUpdatePendingHandler;

  /** Handler for deleting the goal */
  onDeleteGoal: GoalDeleteHandler;

  /** Optional handler for toggling completion */
  onToggleComplete?: GoalCompletionHandler;
}
