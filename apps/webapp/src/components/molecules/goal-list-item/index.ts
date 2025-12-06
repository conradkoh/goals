/**
 * Goal List Item
 *
 * A composable component system for rendering goal items in lists.
 * Provides both pre-composed variants and building blocks for custom compositions.
 *
 * ## Architecture
 *
 * The component follows a layered architecture:
 * - **Variants**: Pre-composed components for specific goal types (Weekly, Daily, Quarterly, Adhoc)
 * - **View**: Base components and composable building blocks
 *
 * ## Key Feature: Pending Update Tracking
 *
 * The component system includes built-in support for tracking pending updates:
 * - When an edit popover saves, it can pass the promise via `onUpdatePending`
 * - The list item shows a spinner until the promise resolves
 * - This ensures users know when their changes are still being saved
 *
 * ## Usage
 *
 * ### Using Pre-composed Variants (Recommended)
 *
 * ```tsx
 * import {
 *   WeeklyGoalItem,
 *   DailyGoalItem,
 *   QuarterlyGoalItem,
 *   AdhocGoalItem,
 * } from '@/components/molecules/goal-list-item';
 *
 * // Weekly goal (context-based)
 * <GoalProvider goal={weeklyGoal}>
 *   <WeeklyGoalItem />
 * </GoalProvider>
 *
 * // Daily goal (context-based)
 * <GoalProvider goal={dailyGoal}>
 *   <DailyGoalItem />
 * </GoalProvider>
 *
 * // Quarterly goal (context-based)
 * <GoalProvider goal={quarterlyGoal}>
 *   <QuarterlyGoalItem
 *     onToggleStatus={handleToggleStatus}
 *     onUpdateGoal={handleUpdate}
 *   />
 * </GoalProvider>
 *
 * // Adhoc goal (prop-based, supports nested children)
 * <AdhocGoalItem
 *   goal={adhocGoal}
 *   onUpdate={handleUpdate}
 *   onDelete={handleDelete}
 *   onCreateChild={handleCreateChild}
 * />
 * ```
 *
 * ### Building Custom Compositions
 *
 * ```tsx
 * import {
 *   GoalListItemView,
 *   GoalCheckbox,
 *   GoalStatusIcons,
 *   GoalPendingIndicator,
 *   GoalActionButtons,
 * } from '@/components/molecules/goal-list-item/view';
 *
 * <GoalListItemView enablePendingState>
 *   <GoalCheckbox onToggleComplete={handleToggle} />
 *   <MyCustomTrigger />
 *   <GoalPendingIndicator isOptimistic={goal.isOptimistic}>
 *     <GoalStatusIcons goalId={goal._id} />
 *     <GoalActionButtons onSave={handleSave} />
 *   </GoalPendingIndicator>
 * </GoalListItemView>
 * ```
 */

// Re-export variants (most common usage)
export * from './variants';

// Re-export view components for custom compositions
export * from './view';
