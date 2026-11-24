import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';

import { summariseChildGoals } from './childGoalSummary';
import { GoalChildrenDisclosure } from './GoalChildrenDisclosure';
import { GoalDetailsChildRows } from './GoalDetailsChildRows';

import { WeeklyGoalTaskItem } from '@/components/molecules/day-of-week/components/WeeklyGoalTaskItem';
import { DailyGoalTaskItem } from '@/components/organisms/DailyGoalTaskItem';

/**
 * Props for the GoalDetailsChildrenList component.
 */
export interface GoalDetailsChildrenListProps {
  /** The parent goal containing sub-goals to display */
  parentGoal: GoalWithDetailsAndChildren;
  /** Section title shown above the sub-goals list */
  title: string;
  /** Optional filtered sub-goals to render. If not provided, uses parentGoal.children */
  subGoalsToRender?: GoalWithDetailsAndChildren[];
  /**
   * Render the list behind a collapsed count summary that expands on click.
   * Default false: the title is shown as an always-expanded heading.
   */
  collapsible?: boolean;
}

/**
 * Displays a hierarchical list of sub-goals within a goal details view.
 * Renders weekly goals for quarterly parents, and daily goals for weekly parents.
 * Supports nested grandchildren (daily goals under weekly goals within quarterly).
 * Supports filtering via subGoalsToRender prop for selective display.
 * With `collapsible`, the list sits behind a count summary.
 *
 * @example
 * ```tsx
 * <GoalDetailsChildrenList
 *   parentGoal={quarterlyGoal}
 *   title="Weekly Goals"
 * />
 * ```
 */
export function GoalDetailsChildrenList({
  parentGoal,
  title,
  subGoalsToRender,
  collapsible,
}: GoalDetailsChildrenListProps) {
  // Use provided subGoalsToRender if available, otherwise use parentGoal.children
  const subGoals: GoalWithDetailsAndChildren[] | undefined =
    subGoalsToRender !== undefined ? subGoalsToRender : parentGoal.children;

  // If there are no sub-goals (or the list is absent), don't render anything
  if (!subGoals || subGoals.length === 0) {
    return null;
  }

  const isQuarterlyParent = parentGoal.depth === 0;
  const list = (
    <GoalDetailsChildRows
      subGoals={subGoals}
      isQuarterlyParent={isQuarterlyParent}
      weeklyRow={WeeklyGoalTaskItem}
      dailyRow={DailyGoalTaskItem}
    />
  );

  if (!collapsible) {
    return (
      <div className="mt-3">
        <h4 className="text-sm font-semibold mb-3 text-foreground bg-muted py-1.5 px-4 rounded-md">
          {title}
        </h4>
        {list}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <GoalChildrenDisclosure
        title={title}
        summary={summariseChildGoals(subGoals, isQuarterlyParent)}
      >
        {list}
      </GoalChildrenDisclosure>
    </div>
  );
}
