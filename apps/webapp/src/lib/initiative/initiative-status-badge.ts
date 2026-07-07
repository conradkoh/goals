import type { InitiativeDateStatus } from '@/lib/date/initiative-dates';
import { getInitiativeDateStatus } from '@/lib/date/initiative-dates';

export const initiativeStatusBadge: Record<
  InitiativeDateStatus,
  { label: string; className: string }
> = {
  active: {
    label: 'Active',
    className: 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400',
  },
  upcoming: {
    label: 'Upcoming',
    className: 'bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400',
  },
  ended: { label: 'Ended', className: 'bg-muted text-muted-foreground' },
};

const initiativeStatusOrder: Record<InitiativeDateStatus, number> = {
  active: 0,
  upcoming: 1,
  ended: 2,
};

type InitiativeSortFields = {
  startDate: number;
  endDate?: number;
  title: string;
};

function compareInitiativesByStatusAndDate(
  a: InitiativeSortFields,
  b: InitiativeSortFields
): number {
  const statusA = getInitiativeDateStatus(a.startDate, a.endDate);
  const statusB = getInitiativeDateStatus(b.startDate, b.endDate);
  const statusDiff = initiativeStatusOrder[statusA] - initiativeStatusOrder[statusB];
  if (statusDiff !== 0) return statusDiff;
  return a.startDate - b.startDate || a.title.localeCompare(b.title);
}

export function sortInitiativesByStatusAndDate<T extends InitiativeSortFields>(
  initiatives: T[]
): T[] {
  return [...initiatives].sort(compareInitiativesByStatusAndDate);
}
