import { DateTime } from 'luxon';

export type InitiativeDateStatus = 'active' | 'upcoming' | 'ended';

export function normalizeInitiativeDateRange(
  start: Date,
  end: Date
): { startDate: number; endDate: number } {
  const startDate = DateTime.fromJSDate(start).startOf('day').toMillis();
  const endDate = DateTime.fromJSDate(end).endOf('day').toMillis();
  return { startDate, endDate };
}

export function getInitiativeDateStatus(
  startDate: number,
  endDate: number,
  now: DateTime<boolean> = DateTime.now()
): InitiativeDateStatus {
  const todayStart = now.startOf('day').toMillis();
  const todayEnd = now.endOf('day').toMillis();
  if (endDate < todayStart) return 'ended';
  if (startDate > todayEnd) return 'upcoming';
  return 'active';
}

export function formatInitiativeDateRange(startDate: number, endDate: number): string {
  const start = DateTime.fromMillis(startDate).toFormat('MMM d, yyyy');
  const end = DateTime.fromMillis(endDate).toFormat('MMM d, yyyy');
  return `${start} – ${end}`;
}
