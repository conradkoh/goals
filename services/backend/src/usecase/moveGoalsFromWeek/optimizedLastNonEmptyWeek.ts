import type { TimePeriod } from './types';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/_generated/server';

/**
 * Efficiently find the last non-empty week by querying goal states in batch
 * This reduces the number of database queries compared to the sequential approach
 */
export async function findLastNonEmptyWeekOptimized(
  ctx: MutationCtx,
  userId: Id<'users'>,
  targetWeek: TimePeriod,
  maxWeeksToSearch = 13
): Promise<TimePeriod | null> {
  const candidateWeeks: TimePeriod[] = [];

  // Generate all candidate weeks upfront
  let candidate = {
    year: targetWeek.year,
    quarter: targetWeek.quarter,
    weekNumber: targetWeek.weekNumber - 1,
  };

  for (let i = 0; i < maxWeeksToSearch; i++) {
    // Handle quarter/year boundaries
    if (candidate.weekNumber < 1) {
      let prevQuarter = candidate.quarter - 1;
      let prevYear = candidate.year;
      if (prevQuarter < 1) {
        prevQuarter = 4;
        prevYear = candidate.year - 1;
      }
      candidate = {
        year: prevYear,
        quarter: prevQuarter,
        weekNumber: 13, // safe upper-bound for weeks per quarter
      };
    }

    candidateWeeks.push({ ...candidate });
    candidate = { ...candidate, weekNumber: candidate.weekNumber - 1 };
  }

  // Query goal states for all candidate weeks in parallel
  const weekStatePromises = candidateWeeks.map(async (week) => ({
    week,
    states: await ctx.db
      .query('goalStateByWeek')
      .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
        q
          .eq('userId', userId)
          .eq('year', week.year)
          .eq('quarter', week.quarter)
          .eq('weekNumber', week.weekNumber)
      )
      .collect(),
  }));

  const weekStateResults = await Promise.all(weekStatePromises);

  // Find the first week (most recent) that has goal states
  for (const { week, states } of weekStateResults) {
    if (states.length > 0) {
      // Additional check: ensure there are actual movable goals
      // (goals that are starred, pinned, or have daily states)
      const hasMovableContent = states.some(
        (state) => state.isStarred || state.isPinned || state.daily !== undefined
      );

      if (hasMovableContent) {
        return week;
      }
    }
  }

  return null;
}

/**
 * Get minimal goal state data needed for the last non-empty week search
 * This avoids fetching full goal documents until we've identified the target week
 */
export async function getMinimalWeekStates(
  ctx: MutationCtx,
  userId: Id<'users'>,
  week: TimePeriod
): Promise<Doc<'goalStateByWeek'>[]> {
  return await ctx.db
    .query('goalStateByWeek')
    .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
      q
        .eq('userId', userId)
        .eq('year', week.year)
        .eq('quarter', week.quarter)
        .eq('weekNumber', week.weekNumber)
    )
    .collect();
}
