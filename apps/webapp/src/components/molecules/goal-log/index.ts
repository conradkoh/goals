/**
 * Goal Log Components
 *
 * The Log section of the single-scroll goal details body is `GoalLogSection`. It is
 * rendered by `GoalDetailsBody`; surfaces do not mount it directly.
 *
 * ```tsx
 * import { GoalLogSection } from '@/components/molecules/goal-log';
 *
 * <GoalLogSection goalId={goal._id} onFormActiveChange={handleNestedActiveChange} />
 * ```
 */

export { GoalLogSection } from './GoalLogSection';
