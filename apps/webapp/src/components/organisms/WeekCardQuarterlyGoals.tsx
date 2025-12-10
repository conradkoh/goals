import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { useCallback, useMemo, useState } from 'react';
import {
  CollapsibleMinimal,
  CollapsibleMinimalContent,
  CollapsibleMinimalTrigger,
} from '@/components/ui/collapsible-minimal';
import { Skeleton } from '@/components/ui/skeleton';
import { GoalProvider } from '@/contexts/GoalContext';
import { useWeek } from '@/hooks/useWeek';
import { CreateGoalInput } from '../atoms/CreateGoalInput';
import { QuarterlyGoal } from './QuarterlyGoal';

interface WeekCardQuarterlyGoalsProps {
  weekNumber: number;
  year: number;
  quarter: number;
  isLoading?: boolean;
}

// Loading skeleton for quarterly goals
const QuarterlyGoalsSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-5/6" />
    <Skeleton className="h-10 w-4/5" />
  </div>
);

// Helper function to sort goals by status and creation time
const sortGoals = (goals: GoalWithDetailsAndChildren[]): GoalWithDetailsAndChildren[] => {
  // Sort function that prioritizes starred -> pinned -> neither
  // Within each group, sort by creation time (oldest first for stability)
  return [...goals].sort((a, b) => {
    const aWeekly = a.state;
    const bWeekly = b.state;

    // First, group by status
    if (aWeekly?.isStarred && !bWeekly?.isStarred) return -1;
    if (!aWeekly?.isStarred && bWeekly?.isStarred) return 1;
    if (aWeekly?.isPinned && !bWeekly?.isPinned) return -1;
    if (!aWeekly?.isPinned && bWeekly?.isPinned) return 1;

    // Within the same status group, sort by creation time (oldest first)
    // This provides a stable, predictable ordering that respects user intent
    const aCreationTime = a._creationTime ?? 0;
    const bCreationTime = b._creationTime ?? 0;
    return aCreationTime - bCreationTime;
  });
};

export const WeekCardQuarterlyGoals = ({
  weekNumber,
  year,
  quarter,
  isLoading = false,
}: WeekCardQuarterlyGoalsProps) => {
  const {
    quarterlyGoals,
    createQuarterlyGoal,
    updateQuarterlyGoalStatus,
    updateQuarterlyGoalTitle,
    deleteGoalOptimistic: deleteGoal,
  } = useWeek();
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
  }, [createQuarterlyGoal, newGoalTitle, weekNumber, year, quarter, isExpanded]);

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

  const handleUpdateGoal = useCallback(
    async (
      goalId: Id<'goals'>,
      title: string,
      details?: string,
      dueDate?: number,
      domainId?: Id<'domains'> | null
    ) => {
      try {
        await updateQuarterlyGoalTitle({
          goalId,
          title,
          details,
          dueDate,
          domainId,
        });
      } catch (error) {
        console.error('Failed to update goal:', error);
        throw error;
      }
    },
    [updateQuarterlyGoalTitle]
  );

  const handleDeleteGoal = useCallback(
    async (goalId: Id<'goals'>) => {
      try {
        await deleteGoal(goalId);
      } catch (error) {
        console.error('Failed to delete goal:', error);
        throw error;
      }
    },
    [deleteGoal]
  );
  // Ensure handleDeleteGoal is available for potential use
  void handleDeleteGoal;

  // Sort the goals before rendering
  const sortedGoals = useMemo(() => sortGoals(quarterlyGoals), [quarterlyGoals]);

  // Split goals into important (starred/pinned) and other
  const { importantGoals, otherGoals } = useMemo(() => {
    const important = sortedGoals.filter((goal) => goal.state?.isStarred || goal.state?.isPinned);
    const other = sortedGoals.filter((goal) => !goal.state?.isStarred && !goal.state?.isPinned);
    return { importantGoals: important, otherGoals: other };
  }, [sortedGoals]);

  // If loading, show skeleton
  if (isLoading) {
    return <QuarterlyGoalsSkeleton />;
  }

  return (
    <div className="space-y-2">
      <CreateGoalInput
        placeholder="Add a task..."
        value={newGoalTitle}
        onChange={setNewGoalTitle}
        onSubmit={handleCreateGoal}
      />

      <div className="space-y-1">
        {/* Important goals are always visible */}
        {importantGoals.map((goal) => (
          <GoalProvider key={goal._id} goal={goal}>
            <QuarterlyGoal onToggleStatus={handleToggleStatus} onUpdateGoal={handleUpdateGoal} />
          </GoalProvider>
        ))}

        {/* Other goals are shown when expanded */}
        {otherGoals.length > 0 && (
          <CollapsibleMinimal open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleMinimalTrigger>
              {isExpanded ? 'Show less' : `${otherGoals.length} more goals`}
            </CollapsibleMinimalTrigger>
            <CollapsibleMinimalContent>
              {otherGoals.map((goal) => (
                <GoalProvider key={goal._id} goal={goal}>
                  <QuarterlyGoal
                    onToggleStatus={handleToggleStatus}
                    onUpdateGoal={handleUpdateGoal}
                  />
                </GoalProvider>
              ))}
            </CollapsibleMinimalContent>
          </CollapsibleMinimal>
        )}
      </div>
    </div>
  );
};
