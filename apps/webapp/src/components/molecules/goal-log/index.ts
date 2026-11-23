/**
 * Goal Log Components
 *
 * A component system for displaying and managing goal log entries.
 *
 * ## Usage
 *
 * The Log section of the single-scroll goal details body is `GoalLogSection`. It is
 * rendered by `GoalDetailsBody`; surfaces do not mount it directly.
 *
 * ```tsx
 * import { GoalLogSection } from '@/components/molecules/goal-log';
 *
 * <GoalLogSection goalId={goal._id} onFormActiveChange={handleNestedActiveChange} />
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

export { GoalLogSection } from './GoalLogSection';

export { GoalLogList } from './GoalLogList';
export type { GoalLogListProps } from './GoalLogList';

export { GoalLogEntry } from './GoalLogEntry';
export type { GoalLogEntryProps } from './GoalLogEntry';

export { GoalLogCreateForm, GoalLogEditForm } from './GoalLogCreateForm';
export type { GoalLogCreateFormProps, GoalLogEditFormProps } from './GoalLogCreateForm';
