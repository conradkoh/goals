/**
 * Status colors for goal states with dark mode support.
 * These classes automatically adapt to light/dark mode.
 */
export const statusColors = {
  starred: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    text: 'text-yellow-800 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'fill-yellow-400 text-yellow-400',
    iconInactive: 'text-muted-foreground hover:text-yellow-500',
  },
  pinned: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-800 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'fill-blue-400 text-blue-400',
    iconInactive: 'text-muted-foreground hover:text-blue-500',
  },
  complete: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    text: 'text-green-800 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
  },
  onFire: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-800 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  selected: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  currentWeek: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    ring: 'ring-2 ring-blue-500 dark:ring-blue-400',
  },
} as const;

/**
 * Helper to get background color for goal state
 */
export function getGoalStateBackground(state: {
  isStarred?: boolean;
  isPinned?: boolean;
  isSoftComplete?: boolean;
}): string {
  if (state.isSoftComplete) return statusColors.complete.bg;
  if (state.isPinned) return statusColors.pinned.bg;
  if (state.isStarred) return statusColors.starred.bg;
  return '';
}
