import type { InitiativeDateStatus } from '@/lib/date/initiative-dates';

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

export const initiativeStatusOrder: Record<InitiativeDateStatus, number> = {
  active: 0,
  upcoming: 1,
  ended: 2,
};
