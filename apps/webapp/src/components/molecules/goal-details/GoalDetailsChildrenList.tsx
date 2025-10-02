import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useCallback } from 'react';
import { WeeklyGoalTaskItem } from '@/components/molecules/day-of-week/components/WeeklyGoalTaskItem';
import { DailyGoalTaskItem } from '@/components/organisms/DailyGoalTaskItem';
import { useWeek } from '@/hooks/useWeek';

interface GoalDetailsChildrenListProps {
  parentGoal: GoalWithDetailsAndChildren;
  title: string;
}

export function GoalDetailsChildrenList({ parentGoal, title }: GoalDetailsChildrenListProps) {
  const { updateQuarterlyGoalTitle, deleteGoalOptimistic } = useWeek();

  // Handle title update for child goals
  const handleUpdateTitle = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string) => {
      await updateQuarterlyGoalTitle({
        goalId,
        title,
        details,
      });
    },
    [updateQuarterlyGoalTitle]
  );

  // Handle goal deletion
  const handleDeleteGoal = useCallback(
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
      <div className="space-y-1 px-2">
        {parentGoal.children.map((child) => (
          <div key={child._id}>
            {isQuarterlyParent ? (
              // Render weekly goals when parent is quarterly
              <WeeklyGoalTaskItem goal={child} onUpdateTitle={handleUpdateTitle} />
            ) : (
              // Render daily goals when parent is weekly
              <DailyGoalTaskItem
                goal={child}
                onUpdateTitle={handleUpdateTitle}
                onDelete={() => handleDeleteGoal(child._id)}
              />
            )}

            {/* If the parent is a quarterly goal and we have grandchildren (daily goals), 
                show them indented under their weekly parent */}
            {isQuarterlyParent && child.children && child.children.length > 0 && (
              <div className="ml-6 mt-1 mb-2 space-y-1 border-l-2 border-gray-100 pl-3">
                {child.children.map((grandchild) => (
                  <DailyGoalTaskItem
                    key={grandchild._id}
                    goal={grandchild}
                    onUpdateTitle={handleUpdateTitle}
                    onDelete={() => handleDeleteGoal(grandchild._id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
