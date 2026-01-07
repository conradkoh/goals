/**
 * V2 Industrial Design System - Goal Status Indicators Component
 *
 * Features:
 * - Bold uppercase text with wide tracking
 * - 10px font size
 * - Square indicators
 */
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
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {isStarred && (
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-warning" />
          <span className="text-warning">Starred</span>
        </div>
      )}
      {isPinned && (
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-info" />
          <span className="text-info">Pinned</span>
        </div>
      )}
    </div>
  );
}
