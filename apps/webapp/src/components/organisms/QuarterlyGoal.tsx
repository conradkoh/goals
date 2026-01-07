/**
 * @file Re-export of QuarterlyGoalItem as QuarterlyGoal for backward compatibility.
 *
 * This file provides backward compatibility for existing imports of QuarterlyGoal.
 * The actual implementation has been moved to the unified goal-list-item component system.
 *
 * @deprecated Use `QuarterlyGoalItem` from `@/components/molecules/goal-list-item` instead.
 *
 * @example
 * ```tsx
 * // Old (deprecated):
 * import { QuarterlyGoal } from '@/components/organisms/QuarterlyGoal';
 *
 * // New (recommended):
 * import { QuarterlyGoalItem } from '@/components/molecules/goal-list-item';
 * ```
 */

export { QuarterlyGoalItem as QuarterlyGoal } from '@/components/molecules/goal-list-item';
