/**
 * @file Re-export of AdhocGoalItem for backward compatibility.
 *
 * This file provides backward compatibility for existing imports of AdhocGoalItem.
 * The actual implementation has been moved to the unified goal-list-item component system.
 *
 * @deprecated Use `AdhocGoalItem` from `@/components/molecules/goal-list-item` instead.
 *
 * @example
 * ```tsx
 * // Old (deprecated):
 * import { AdhocGoalItem } from '@/components/molecules/AdhocGoalItem';
 *
 * // New (recommended):
 * import { AdhocGoalItem } from '@/components/molecules/goal-list-item';
 * ```
 */

export { AdhocGoalItem, type AdhocGoalItemProps } from '@/components/molecules/goal-list-item';
