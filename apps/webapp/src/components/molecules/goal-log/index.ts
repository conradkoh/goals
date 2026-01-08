/**
 * Goal Log Components
 *
 * A component system for displaying and managing goal log entries.
 *
 * ## Usage
 *
 * The main component to use is `GoalLogTab`, which provides a complete
 * log management interface with list display and entry creation.
 *
 * ```tsx
 * import { GoalLogTab } from '@/components/molecules/goal-log';
 *
 * // In a goal details modal
 * <GoalLogTab goalId={goal._id} />
 * ```
 *
 * ## Individual Components
 *
 * For custom implementations, you can use the individual components:
 *
 * - `GoalLogEntry` - Display a single log entry
 * - `GoalLogList` - Display a grouped list of log entries
 * - `GoalLogCreateForm` - Form to create new log entries
 * - `GoalLogEditForm` - Form to edit existing log entries
 */

export { GoalLogTab } from './GoalLogTab';
export type { GoalLogTabProps } from './GoalLogTab';

export { GoalLogList } from './GoalLogList';
export type { GoalLogListProps } from './GoalLogList';

export { GoalLogEntry } from './GoalLogEntry';
export type { GoalLogEntryProps } from './GoalLogEntry';

export { GoalLogCreateForm, GoalLogEditForm } from './GoalLogCreateForm';
export type { GoalLogCreateFormProps, GoalLogEditFormProps } from './GoalLogCreateForm';
