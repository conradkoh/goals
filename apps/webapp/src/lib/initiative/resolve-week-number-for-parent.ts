import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { getQuarterWeeks } from '@workspace/backend/src/usecase/quarter';

/**
 * Resolve the week number to use when creating a weekly/daily goal under a
 * parent that may live in a different year/quarter than the currently focused
 * week. Parents in the focus week's quarter use the focus week number;
 * otherwise fall back to the first week of the parent's own quarter.
 */
export function resolveWeekNumberForParent(
  parent: Doc<'goals'>,
  focusYear: number,
  focusQuarter: number,
  focusWeekNumber: number
): number {
  if (parent.year === focusYear && parent.quarter === focusQuarter) {
    return focusWeekNumber;
  }
  const { weeks } = getQuarterWeeks(parent.year, parent.quarter);
  return weeks[0] ?? focusWeekNumber;
}
