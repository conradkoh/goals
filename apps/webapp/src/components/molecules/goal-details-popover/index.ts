/**
 * Goal Details Popover Components
 *
 * A composable component system for displaying goal details in popovers.
 *
 * ## Architecture
 *
 * This module follows a composition-over-inheritance pattern:
 *
 * - **view/** - Base components and composable building blocks
 *   - `GoalDetailsPopoverView` - The popover shell
 *   - `GoalPopoverTrigger` - Standard trigger button
 *   - `components/` - Composable pieces (Header, DueDate, Children, etc.)
 *
 * - **variants/** - Pre-composed variants for different goal types
 *   - `QuarterlyGoalPopover` - For quarterly goals with star/pin and weekly children
 *   - `WeeklyGoalPopover` - For weekly goals with daily children
 *   - `DailyGoalPopover` - For daily goals (leaf nodes)
 *
 * ## Usage
 *
 * ### Using Pre-composed Variants (Recommended)
 * ```tsx
 * import { QuarterlyGoalPopover, WeeklyGoalPopover, DailyGoalPopover } from '@/components/molecules/goal-details-popover';
 *
 * // For quarterly goals
 * <QuarterlyGoalPopover goal={goal} onSave={handleSave} />
 *
 * // For weekly goals
 * <WeeklyGoalPopover goal={goal} onSave={handleSave} />
 *
 * // For daily goals
 * <DailyGoalPopover goal={goal} onSave={handleSave} additionalContent={<DaySelector />} />
 * ```
 *
 * ### Building Custom Compositions
 * ```tsx
 * import {
 *   GoalDetailsPopoverView,
 *   GoalPopoverTrigger,
 *   GoalHeader,
 *   GoalDueDateDisplay,
 *   GoalDetailsSection,
 * } from '@/components/molecules/goal-details-popover/view';
 *
 * <GoalDetailsPopoverView
 *   popoverKey={goal._id}
 *   trigger={<GoalPopoverTrigger title={goal.title} />}
 * >
 *   <GoalHeader title={goal.title} isComplete={goal.isComplete} />
 *   {goal.dueDate && <GoalDueDateDisplay dueDate={goal.dueDate} isComplete={goal.isComplete} />}
 *   {goal.details && <GoalDetailsSection title={goal.title} details={goal.details} />}
 * </GoalDetailsPopoverView>
 * ```
 */

// Re-export variants (most common usage)
export * from './variants';

// Re-export view components for custom compositions
export * from './view';
