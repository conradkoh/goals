/**
 * Fixed English date formatting for quarterly markdown.
 *
 * Constraint: uses Intl.DateTimeFormat parts only (never toLocaleDateString /
 * toLocaleTimeString, which can emit locale variants or U+202F), so the output
 * is stable across environments. `timeZone` undefined means the system zone,
 * matching the legacy behavior.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? '';
  const cached = formatterCache.get(key);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });
  formatterCache.set(key, formatter);
  return formatter;
}

function partsOf(ms: number, timeZone?: string): DateParts {
  const values: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(ms)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour % 24,
    minute: values.minute,
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Formats an instant as a `yyyy-MM-dd` grouping key in the given zone.
 *
 * @param ms - epoch milliseconds
 * @param timeZone - IANA zone; defaults to the system zone
 * @returns date key such as `2026-11-19`
 */
export function formatDateKey(ms: number, timeZone?: string): string {
  const p = partsOf(ms, timeZone);
  return `${String(p.year).padStart(4, '0')}-${pad2(p.month)}-${pad2(p.day)}`;
}

/**
 * Formats an instant as `LLL d, yyyy` in the given zone.
 *
 * @param ms - epoch milliseconds
 * @param timeZone - IANA zone; defaults to the system zone
 * @returns date such as `Nov 19, 2026`
 */
export function formatDay(ms: number, timeZone?: string): string {
  const p = partsOf(ms, timeZone);
  return `${MONTHS[p.month - 1]} ${p.day}, ${p.year}`;
}

/**
 * Formats a `yyyy-MM-dd` key as `LLL d, yyyy` without re-parsing in a zone.
 *
 * @param key - date key produced by `formatDateKey`
 * @returns date such as `Nov 19, 2026`
 */
export function formatDayFromKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/**
 * Formats an instant as the `Generated on` footer text.
 *
 * @param ms - epoch milliseconds
 * @param timeZone - IANA zone; defaults to the system zone
 * @returns footer timestamp such as `Nov 19, 2026 at 12:30 PM`
 */
export function formatGeneratedAt(ms: number, timeZone?: string): string {
  const p = partsOf(ms, timeZone);
  const meridiem = p.hour < 12 ? 'AM' : 'PM';
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${MONTHS[p.month - 1]} ${p.day}, ${p.year} at ${h12}:${pad2(p.minute)} ${meridiem}`;
}
