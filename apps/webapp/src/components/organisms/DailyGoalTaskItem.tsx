/**
 * @fileoverview Re-export of DailyGoalItem as DailyGoalTaskItem for backward compatibility.
 *
 * This file provides backward compatibility for existing imports of DailyGoalTaskItem.
 * The actual implementation has been moved to the unified goal-list-item component system.
 *
 * @deprecated Use `DailyGoalItem` from `@/components/molecules/goal-list-item` instead.
 *
 * @example
 * ```tsx
 * // Old (deprecated):
 * import { DailyGoalTaskItem } from '@/components/organisms/DailyGoalTaskItem';
 *
 * // New (recommended):
 * import { DailyGoalItem } from '@/components/molecules/goal-list-item';
 * ```
 */

export { DailyGoalItem as DailyGoalTaskItem } from '@/components/molecules/goal-list-item';
