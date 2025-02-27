import { useState, useCallback, useMemo } from 'react';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { useWeek } from '@/hooks/useWeek';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import {
  CollapsibleMinimal,
  CollapsibleMinimalTrigger,
  CollapsibleMinimalContent,
} from '@/components/ui/collapsible-minimal';
import { QuarterlyGoal } from '../../goals-new/QuarterlyGoal';
import { useGoalActions } from '@/hooks/useGoalActions';

interface WeekCardQuarterlyGoalsProps {
  weekNumber: number;
  year: number;
  quarter: number;
}

// Helper function to sort goals by status and title
const sortGoals = (
  goals: GoalWithDetailsAndChildren[]
): GoalWithDetailsAndChildren[] => {
  // Sort function that prioritizes starred -> pinned -> neither
  // Within each group, sort alphabetically by title
  return [...goals].sort((a, b) => {
    const aWeekly = a.state;
    const bWeekly = b.state;

    // First, group by status
    if (aWeekly?.isStarred && !bWeekly?.isStarred) return -1;
    if (!aWeekly?.isStarred && bWeekly?.isStarred) return 1;
    if (aWeekly?.isPinned && !bWeekly?.isPinned) return -1;
    if (!aWeekly?.isPinned && bWeekly?.isPinned) return 1;

    // Within the same status group, sort alphabetically
    return a.title.localeCompare(b.title);
  });
};

export const WeekCardQuarterlyGoals = ({
  weekNumber,
  year,
  quarter,
}: WeekCardQuarterlyGoalsProps) => {
  const {
    createQuarterlyGoal,
    updateQuarterlyGoalStatus,
    updateQuarterlyGoalTitle,
    deleteQuarterlyGoal,
  } = useGoalActions();
  const { quarterlyGoals } = useWeek();
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCreateGoal = useCallback(async () => {
    if (!newGoalTitle.trim()) return;
    try {
      // When not expanded, create the goal as pinned by default
      await createQuarterlyGoal({
        title: newGoalTitle.trim(),
        weekNumber,
        year,
        quarter,
        isPinned: !isExpanded,
        isStarred: false,
      });
      setNewGoalTitle('');
    } catch (error) {
      console.error('Failed to create quarterly goal:', error);
      // TODO: Add proper error handling UI
    }
  }, [
    createQuarterlyGoal,
    newGoalTitle,
    weekNumber,
    year,
    quarter,
    isExpanded,
  ]);

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
        // TODO: Add proper error handling UI
      }
    },
    [updateQuarterlyGoalStatus, weekNumber, year, quarter]
  );

  const handleUpdateTitle = useCallback(
    async (goalId: Id<'goals'>, title: string, details?: string) => {
      try {
        await updateQuarterlyGoalTitle({
          goalId,
          title,
          details,
        });
      } catch (error) {
        console.error('Failed to update goal title:', error);
        throw error;
      }
    },
    [updateQuarterlyGoalTitle]
  );

  const handleDeleteGoal = useCallback(
    async (goalId: Id<'goals'>) => {
      try {
        await deleteQuarterlyGoal({
          goalId,
        });
      } catch (error) {
        console.error('Failed to delete goal:', error);
        throw error;
      }
    },
    [deleteQuarterlyGoal]
  );

  // Sort the goals before rendering
  const sortedGoals = useMemo(
    () => sortGoals(quarterlyGoals),
    [quarterlyGoals]
  );

  // Split goals into important (starred/pinned) and other
  const { importantGoals, otherGoals } = useMemo(() => {
    const important = sortedGoals.filter(
      (goal) => goal.state?.isStarred || goal.state?.isPinned
    );
    const other = sortedGoals.filter(
      (goal) => !goal.state?.isStarred && !goal.state?.isPinned
    );
    return { importantGoals: important, otherGoals: other };
  }, [sortedGoals]);

  return (
    <div className="space-y-2">
      <CreateGoalInput
        placeholder="Add a quarterly goal..."
        value={newGoalTitle}
        onChange={setNewGoalTitle}
        onSubmit={handleCreateGoal}
      />

      <div className="space-y-1">
        {/* Important goals are always visible */}
        {importantGoals.map((goal) => (
          <QuarterlyGoal
            key={goal._id}
            goal={goal}
            weekNumber={weekNumber}
            onToggleStatus={handleToggleStatus}
            onUpdateTitle={handleUpdateTitle}
            onDelete={handleDeleteGoal}
          />
        ))}

        {/* Other goals are shown when expanded */}
        {otherGoals.length > 0 && (
          <CollapsibleMinimal open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleMinimalTrigger>
              {isExpanded ? 'Show less' : `${otherGoals.length} more goals`}
            </CollapsibleMinimalTrigger>
            <CollapsibleMinimalContent>
              {otherGoals.map((goal) => (
                <QuarterlyGoal
                  key={goal._id}
                  goal={goal}
                  weekNumber={weekNumber}
                  onToggleStatus={handleToggleStatus}
                  onUpdateTitle={handleUpdateTitle}
                  onDelete={handleDeleteGoal}
                />
              ))}
            </CollapsibleMinimalContent>
          </CollapsibleMinimal>
        )}
      </div>
    </div>
  );
};
