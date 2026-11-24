import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';

import { formatChildSummary } from './GoalChildrenDisclosure';

const WEEKLY_NOUN = { singular: 'weekly goal', plural: 'weekly goals' };
const DAILY_NOUN = { singular: 'daily goal', plural: 'daily goals' };

/** Total daily goals nested under the weekly goals of a quarterly parent. */
function countGrandchildren(subGoals: GoalWithDetailsAndChildren[]): number {
  return subGoals.reduce((total, child) => total + (child.children?.length ?? 0), 0);
}

/**
 * Builds the collapsed-state summary for a child list.
 * Quarterly parents: "5 weekly goals · 12 daily goals" (the daily part is omitted when 0).
 * Weekly parents: "3 daily goals".
 */
export function summariseChildGoals(
  subGoals: GoalWithDetailsAndChildren[],
  isQuarterlyParent: boolean
): string {
  const grandchildCount = isQuarterlyParent ? countGrandchildren(subGoals) : 0;
  return formatChildSummary(
    { count: subGoals.length, ...(isQuarterlyParent ? WEEKLY_NOUN : DAILY_NOUN) },
    { count: grandchildCount, ...DAILY_NOUN }
  );
}
