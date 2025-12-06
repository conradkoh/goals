/**
 * @fileoverview Re-export of WeeklyGoalItem as WeeklyGoalTaskItem for backward compatibility.
 *
 * This file provides backward compatibility for existing imports of WeeklyGoalTaskItem.
 * The actual implementation has been moved to the unified goal-list-item component system.
 *
 * @deprecated Use `WeeklyGoalItem` from `@/components/molecules/goal-list-item` instead.
 *
 * @example
 * ```tsx
 * // Old (deprecated):
 * import { WeeklyGoalTaskItem } from '@/components/molecules/day-of-week/components/WeeklyGoalTaskItem';
 *
 * // New (recommended):
 * import { WeeklyGoalItem } from '@/components/molecules/goal-list-item';
 * ```
 */

export { WeeklyGoalItem as WeeklyGoalTaskItem } from '@/components/molecules/goal-list-item';
