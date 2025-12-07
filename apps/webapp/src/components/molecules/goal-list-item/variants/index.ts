/**
 * @fileoverview Pre-composed goal list item variants for different goal types.
 *
 * These variants are ready-to-use components that compose the building blocks
 * from `view/components` with appropriate defaults for each goal type.
 *
 * ## Available Variants
 *
 * - `WeeklyGoalItem` - For weekly goals with checkbox, popover, and actions
 * - `DailyGoalItem` - For daily goals with checkbox, day selector, and actions
 * - `QuarterlyGoalItem` - For quarterly goals with star/pin controls
 * - `AdhocGoalItem` - For adhoc goals with domain badge and nested children support
 *
 * ## Usage
 *
 * ```tsx
 * import { WeeklyGoalItem, DailyGoalItem, AdhocGoalItem } from '@/components/molecules/goal-list-item';
 *
 * <GoalProvider goal={weeklyGoal}>
 *   <WeeklyGoalItem />
 * </GoalProvider>
 *
 * // AdhocGoalItem is prop-based (not context-based)
 * <AdhocGoalItem goal={adhocGoal} onUpdate={handleUpdate} />
 * ```
 */

export { AdhocGoalItem, type AdhocGoalItemProps } from './AdhocGoalItem';
export { DailyGoalItem, type DailyGoalItemProps } from './DailyGoalItem';
export { QuarterlyGoalItem, type QuarterlyGoalItemProps } from './QuarterlyGoalItem';
export { WeeklyGoalItem, type WeeklyGoalItemProps } from './WeeklyGoalItem';
