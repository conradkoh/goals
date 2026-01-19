import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useCallback, useMemo, useState } from 'react';

import { QuarterlyGoalItem } from '@/components/molecules/goal-list-item';
import {
  CollapsibleMinimal,
  CollapsibleMinimalContent,
  CollapsibleMinimalTrigger,
} from '@/components/ui/collapsible-minimal';
import { GoalProvider } from '@/contexts/GoalContext';
import { useWeek } from '@/hooks/useWeek';

/**
 * Props for the QuarterlyGoalsQuickSection component.
 */
export interface QuarterlyGoalsQuickSectionProps {
  /** Whether to show the section header */
  showHeader?: boolean;
}

/**
 * A collapsible section displaying starred and pinned quarterly goals.
 * Allows users to quickly reference their important quarterly goals
 * and create weekly/daily goals from them via the goal details popover.
 *
 * Features:
 * - Collapsed by default
 * - Shows only starred (started) and pinned quarterly goals
 * - Excludes completed goals
 * - Click on a goal opens the details popover where weekly goals can be created
 *
 * Must be rendered within a WeekProvider context.
 */
export function QuarterlyGoalsQuickSection({ showHeader = true }: QuarterlyGoalsQuickSectionProps) {
  const {
    quarterlyGoals,
    weekNumber,
    year,
    quarter,
    updateQuarterlyGoalStatus,
    updateQuarterlyGoalTitle,
  } = useWeek();
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter for starred/pinned quarterly goals that are not completed
  const starredAndPinnedGoals = useMemo(() => {
    return quarterlyGoals
      .filter((goal) => {
        // Exclude completed goals
        if (goal.isComplete) return false;
        // Only include starred or pinned goals
        const isStarred = goal.state?.isStarred ?? false;
        const isPinned = goal.state?.isPinned ?? false;
        return isStarred || isPinned;
      })
      .sort((a, b) => {
        // Sort: starred first, then pinned, then by creation time (oldest first for stability)
        const aIsStarred = a.state?.isStarred ?? false;
        const aIsPinned = a.state?.isPinned ?? false;
        const bIsStarred = b.state?.isStarred ?? false;
        const bIsPinned = b.state?.isPinned ?? false;

        if (aIsStarred && !bIsStarred) return -1;
        if (!aIsStarred && bIsStarred) return 1;
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;

        // Finally sort by creation time (oldest first for stability)
        return (a._creationTime ?? 0) - (b._creationTime ?? 0);
      });
  }, [quarterlyGoals]);

  // Handler for toggling starred/pinned status
  const handleToggleStatus = useCallback(
    async (goalId: Id<'goals'>, isStarred: boolean, isPinned: boolean) => {
      try {
        await updateQuarterlyGoalStatus({
          weekNumber,
          year,
          quarter,
          goalId,
          isStarred,
          isPinned,
        });
      } catch (error) {
        console.error('Failed to update goal status:', error);
      }
    },
    [updateQuarterlyGoalStatus, weekNumber, year, quarter]
  );

  // Handler for updating goal title/details
  const handleUpdateGoal = useCallback(
    async (
      goalId: Id<'goals'>,
      title: string,
      details?: string,
      dueDate?: number,
      _domainId?: Id<'domains'> | null
    ) => {
      try {
        await updateQuarterlyGoalTitle({
          goalId,
          title,
          details,
          dueDate,
        });
      } catch (error) {
        console.error('Failed to update goal:', error);
        throw error;
      }
    },
    [updateQuarterlyGoalTitle]
  );

  // Don't render if there are no starred/pinned goals
  if (starredAndPinnedGoals.length === 0) {
    return null;
  }

  const triggerText = isExpanded
    ? '💭 Quarterly Goals'
    : `💭 Quarterly Goals (${starredAndPinnedGoals.length})`;

  return (
    <div className="mb-4">
      {showHeader && (
        <div className="font-semibold text-foreground mb-2 text-sm">Quarterly Goals</div>
      )}
      <CollapsibleMinimal open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleMinimalTrigger>{triggerText}</CollapsibleMinimalTrigger>
        <CollapsibleMinimalContent>
          <div className="space-y-1 mt-2">
            {starredAndPinnedGoals.map((goal) => (
              <GoalProvider key={goal._id} goal={goal}>
                <QuarterlyGoalItem
                  onToggleStatus={handleToggleStatus}
                  onUpdateGoal={handleUpdateGoal}
                />
              </GoalProvider>
            ))}
          </div>
        </CollapsibleMinimalContent>
      </CollapsibleMinimal>
    </div>
  );
}
