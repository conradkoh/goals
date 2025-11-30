import { Pin, Star } from 'lucide-react';

export interface GoalStatusIndicatorsProps {
  /** Whether the goal is starred */
  isStarred: boolean;
  /** Whether the goal is pinned */
  isPinned: boolean;
}

/**
 * Displays status indicators (starred/pinned badges) for a goal.
 * Only renders when at least one status is active.
 *
 * @example
 * ```tsx
 * <GoalStatusIndicators isStarred={true} isPinned={false} />
 * ```
 */
export function GoalStatusIndicators({ isStarred, isPinned }: GoalStatusIndicatorsProps) {
  if (!isStarred && !isPinned) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {isStarred && (
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          <span>Starred</span>
        </div>
      )}
      {isPinned && (
        <div className="flex items-center gap-1">
          <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
          <span>Pinned</span>
        </div>
      )}
    </div>
  );
}
