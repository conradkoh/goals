import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { useCallback, type ComponentType } from 'react';

import { GoalActionsProvider } from '@/contexts/GoalActionsContext';
import { GoalProvider } from '@/contexts/GoalContext';
import { buildStructuredGoalMutationArgs } from '@/domain/goal-updates';
import { useWeek } from '@/hooks/useWeek';

interface GoalDetailsChildRowsProps {
  /** Non-empty list of child goals to render */
  subGoals: GoalWithDetailsAndChildren[];
  /** True when the parent is quarterly: rows are weekly goals with daily grandchildren */
  isQuarterlyParent: boolean;
  /** Row component for a weekly goal (used when the parent is quarterly) */
  weeklyRow: ComponentType;
  /** Row component for a daily goal (used for weekly parents and for grandchildren) */
  dailyRow: ComponentType;
}

/**
 * Renders the child goals of a goal-details list inside the goal action context.
 * Rows are weekly goals for a quarterly parent and daily goals for a weekly parent.
 * The row components are injected by the caller only to keep this module out of the
 * goal-list-item import cycles. That is a workaround for the cycle, not a pattern to extend.
 */
export function GoalDetailsChildRows({
  subGoals,
  isQuarterlyParent,
  weeklyRow,
  dailyRow,
}: GoalDetailsChildRowsProps) {
  const { updateQuarterlyGoalTitle, deleteGoalOptimistic } = useWeek();

  // Handle updating child goals
  const handleUpdateGoal = useCallback(
    async (
      goalId: Id<'goals'>,
      title: string,
      details?: string,
      dueDate?: number,
      _domainId?: Id<'domains'> | null,
      initiativeId?: Id<'initiatives'> | null
    ) => {
      await updateQuarterlyGoalTitle({
        goalId,
        ...buildStructuredGoalMutationArgs({
          title,
          details,
          dueDate,
          initiativeId,
        }),
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

  return (
    <GoalActionsProvider onUpdateGoal={handleUpdateGoal} onDeleteGoal={_handleDeleteGoal}>
      <div className="space-y-1 px-4">
        {subGoals.map((child) => (
          <GoalDetailsChildRow
            key={child._id}
            child={child}
            isQuarterlyParent={isQuarterlyParent}
            weeklyRow={weeklyRow}
            dailyRow={dailyRow}
          />
        ))}
      </div>
    </GoalActionsProvider>
  );
}

interface GoalDetailsChildRowProps {
  child: GoalWithDetailsAndChildren;
  isQuarterlyParent: boolean;
  weeklyRow: ComponentType;
  dailyRow: ComponentType;
}

function GoalDetailsChildRow({
  child,
  isQuarterlyParent,
  weeklyRow: WeeklyRow,
  dailyRow: DailyRow,
}: GoalDetailsChildRowProps) {
  // Goals opened from the breadcrumb (dashboard.getGoalDetails) carry no `children` key.
  const grandchildren: GoalWithDetailsAndChildren[] | undefined = child.children;
  return (
    <GoalProvider goal={child}>
      <div>
        {isQuarterlyParent ? (
          <>
            {/* Render weekly goals when parent is quarterly - gets goal from context */}
            <WeeklyRow />

            {/* If we have grandchildren (daily goals), show them indented under their weekly parent */}
            {grandchildren !== undefined && grandchildren.length > 0 && (
              <div className="ml-6 mt-1 mb-2 space-y-1 border-l-2 border-border pl-3">
                {grandchildren.map((grandchild) => (
                  <GoalProvider key={grandchild._id} goal={grandchild}>
                    <DailyRow />
                  </GoalProvider>
                ))}
              </div>
            )}
          </>
        ) : (
          // Render daily goals when parent is weekly - gets goal from context
          <DailyRow />
        )}
      </div>
    </GoalProvider>
  );
}
