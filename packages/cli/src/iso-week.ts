// fallow-ignore-file unused-file
// Standalone until the goal commands import it in a later commit.
/** An ISO-8601 week date: the week-based year and the week number within it. */
export interface IsoWeek {
  year: number;
  week: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * ISO-8601 week-year and week number of the local calendar date of `ms`.
 *
 * The machine's local calendar date decides the answer (so a timestamp late on Sunday is
 * that Sunday's week, whatever the UTC date is); the arithmetic afterwards runs in UTC so
 * DST shifts cannot move the result by a day.
 */
export function isoWeekOf(ms: number): IsoWeek {
  const local = new Date(ms);
  const date = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  const dayOfWeek = date.getUTCDay() || 7; // Monday = 1 … Sunday = 7
  date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek); // Thursday identifies the week's year
  const year = date.getUTCFullYear();
  const firstThursday = Date.UTC(year, 0, 1);
  const week = Math.floor((date.getTime() - firstThursday) / DAY_MS / 7) + 1;
  return { year, week };
}
