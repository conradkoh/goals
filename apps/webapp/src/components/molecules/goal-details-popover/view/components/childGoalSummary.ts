import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';

/** One count inside a collapsed-state summary, e.g. 5 weekly goals. */
export interface ChildCountPhrase {
  /** Number of child goals of this kind. */
  count: number;
  /** Noun used when count is exactly 1, e.g. "weekly goal". */
  singular: string;
  /** Noun used for any other count, e.g. "weekly goals". */
  plural: string;
}

function formatChildCount({ count, singular, plural }: ChildCountPhrase): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Builds the collapsed-state summary: "5 weekly goals" or "5 weekly goals · 12 daily goals".
 * The secondary part is omitted when its count is 0.
 */
export function formatChildSummary(
  primary: ChildCountPhrase,
  secondary?: ChildCountPhrase
): string {
  const parts = [formatChildCount(primary)];
  if (secondary && secondary.count > 0) {
    parts.push(formatChildCount(secondary));
  }
  return parts.join(' · ');
}

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
