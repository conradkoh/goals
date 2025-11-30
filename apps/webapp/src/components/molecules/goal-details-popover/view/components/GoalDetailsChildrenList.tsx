import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useCallback } from 'react';
import { WeeklyGoalTaskItem } from '@/components/molecules/day-of-week/components/WeeklyGoalTaskItem';
import { DailyGoalTaskItem } from '@/components/organisms/DailyGoalTaskItem';
import { GoalActionsProvider } from '@/contexts/GoalActionsContext';
import { GoalProvider } from '@/contexts/GoalContext';
import { useWeek } from '@/hooks/useWeek';

/**
 * Props for the GoalDetailsChildrenList component.
 */
export interface GoalDetailsChildrenListProps {
  /** The parent goal containing children to display */
  parentGoal: GoalWithDetailsAndChildren;
  /** Section title shown above the children list */
  title: string;
}

/**
 * Displays a hierarchical list of child goals within a goal details view.
 * Renders weekly goals for quarterly parents, and daily goals for weekly parents.
 * Supports nested grandchildren (daily goals under weekly goals within quarterly).
 *
 * @example
 * ```tsx
 * <GoalDetailsChildrenList
 *   parentGoal={quarterlyGoal}
 *   title="Weekly Goals"
 * />
 * ```
 */
export function GoalDetailsChildrenList({ parentGoal, title }: GoalDetailsChildrenListProps) {
  const { updateQuarterlyGoalTitle, deleteGoalOptimistic } = useWeek();

  // Handle updating child goals
  const handleUpdateGoal = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string, dueDate?: number) => {
      await updateQuarterlyGoalTitle({
        goalId,
        title,
        details,
        dueDate,
      });
    },
    [updateQuarterlyGoalTitle]
  );

  // Handle goal deletion
  const _handleDeleteGoal = useCallback(
    async (goalId: Id<'goals'>) => {
      await deleteGoalOptimistic(goalId);
    },
    [deleteGoalOptimistic]
  );

  // If there are no children, don't render anything
  if (!parentGoal.children || parentGoal.children.length === 0) {
    return null;
  }

  const isQuarterlyParent = parentGoal.depth === 0;

  return (
    <div className="mt-3">
      <h4 className="text-sm font-semibold mb-3 text-foreground bg-gray-50 py-1.5 px-2 rounded-md">
        {title}
      </h4>
      <GoalActionsProvider onUpdateGoal={handleUpdateGoal} onDeleteGoal={_handleDeleteGoal}>
        <div className="space-y-1 px-2">
          {parentGoal.children.map((child) => (
            <GoalProvider key={child._id} goal={child}>
              <div>
                {isQuarterlyParent ? (
                  // Render weekly goals when parent is quarterly - gets goal from context
                  <WeeklyGoalTaskItem />
                ) : (
                  // Render daily goals when parent is weekly - gets goal from context
                  <DailyGoalTaskItem />
                )}

                {/* If the parent is a quarterly goal and we have grandchildren (daily goals), 
                    show them indented under their weekly parent */}
                {isQuarterlyParent && child.children && child.children.length > 0 && (
                  <div className="ml-6 mt-1 mb-2 space-y-1 border-l-2 border-gray-100 pl-3">
                    {child.children.map((grandchild) => (
                      <GoalProvider key={grandchild._id} goal={grandchild}>
                        <DailyGoalTaskItem />
                      </GoalProvider>
                    ))}
                  </div>
                )}
              </div>
            </GoalProvider>
          ))}
        </div>
      </GoalActionsProvider>
    </div>
  );
}
