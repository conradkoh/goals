import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { AlertTriangle, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// Define the structure of a goal node in the preview
interface GoalPreviewNode {
  _id: Id<'goals'>;
  title: string;
  depth: number;
  children: GoalPreviewNode[];
  weeks?: number[];
}

// Props for the dialog component
interface GoalDeletePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: {
    isDryRun: boolean;
    goalsToDelete: GoalPreviewNode[];
  } | null;
  onDeleteGoals: () => void;
}

// Helper function to get the depth label
const getDepthLabel = (depth: number): string => {
  switch (depth) {
    case 0:
      return 'Quarterly Goal';
    case 1:
      return 'Weekly Goal';
    case 2:
      return 'Daily Goal';
    default:
      return 'Goal';
  }
};

export const GoalDeletePreviewDialog = ({
  open,
  onOpenChange,
  preview,
  onDeleteGoals,
}: GoalDeletePreviewDialogProps) => {
  if (!preview?.goalsToDelete.length) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <span className="block">There are no goals to delete.</span>
                <div className="text-center py-8 text-muted-foreground">
                  <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <span className="block">No goals were found to delete.</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Check if we're deleting a quarterly goal
  const isDeletingQuarterlyGoal = preview.goalsToDelete.some((goal) => goal.depth === 0);

  // Count weekly goals
  const weeklyGoalsCount = countGoalsByDepth(preview.goalsToDelete, 1);

  // Count daily goals
  const dailyGoalsCount = countGoalsByDepth(preview.goalsToDelete, 2);

  // Recursive function to render a goal and its children
  const renderGoalTree = (goal: GoalPreviewNode, level = 0) => {
    const depthLabel = getDepthLabel(goal.depth);
    const isQuarterly = goal.depth === 0;
    const isWeekly = goal.depth === 1;
    const isDaily = goal.depth === 2;

    // Determine background color and text color based on goal type
    let bgColor = '';
    let textColor = '';

    if (isQuarterly) {
      bgColor = 'bg-yellow-50 dark:bg-yellow-950/20';
      textColor = 'text-yellow-800 dark:text-yellow-400';
    } else if (isWeekly) {
      bgColor = 'bg-blue-50 dark:bg-blue-950/20';
      textColor = 'text-blue-800 dark:text-blue-400';
    } else if (isDaily) {
      bgColor = 'bg-green-50 dark:bg-green-950/20';
      textColor = 'text-green-800 dark:text-green-400';
    }

    return (
      <div key={goal._id} className="space-y-2">
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md',
            bgColor,
            level === 0 ? 'font-medium' : ''
          )}
          style={{ marginLeft: `${level * 16}px` }}
        >
          <span className="w-5 text-center">
            {isQuarterly && '💭'}
            {isWeekly && '🚀'}
            {isDaily && '🔍'}
          </span>
          <div className={cn('text-sm break-words flex-grow', textColor)}>
            {goal.title}
            <span className="text-xs ml-2 opacity-70">({depthLabel})</span>
            {!isQuarterly && goal.weeks && goal.weeks.length > 0 && (
              <span className="text-xs ml-2 opacity-70">
                - {goal.weeks.length === 1 ? 'Week' : 'Weeks'}: {goal.weeks.join(', ')}
              </span>
            )}
          </div>
        </div>

        {goal.children.length > 0 && (
          <div className="space-y-2 mt-1">
            {goal.children.map((child) => renderGoalTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Delete Goal</span>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-6 max-h-[50vh] overflow-y-auto">
              {/* Warning section */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Warning:</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-red-500" />
                    <p className="text-sm">
                      This action will permanently delete the selected goal and all its child goals.
                    </p>
                  </div>
                  {isDeletingQuarterlyGoal && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-red-500" />
                      <p className="text-sm">
                        <strong>Important:</strong> Deleting this quarterly goal will delete{' '}
                        {weeklyGoalsCount} weekly goal
                        {weeklyGoalsCount !== 1 ? 's' : ''} across multiple weeks and{' '}
                        {dailyGoalsCount} daily goal
                        {dailyGoalsCount !== 1 ? 's' : ''}.
                      </p>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Trash2 className="h-4 w-4 mt-0.5 text-red-500" />
                    <p className="text-sm">This action cannot be undone.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm">The following items will be deleted:</h3>

                {/* Summary of goals to be deleted */}
                {isDeletingQuarterlyGoal && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    <div className="bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <span>💭</span>
                      <span>1 Quarterly Goal</span>
                    </div>
                    {weeklyGoalsCount > 0 && (
                      <div className="bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <span>🚀</span>
                        <span>
                          {weeklyGoalsCount} Weekly Goal
                          {weeklyGoalsCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    {dailyGoalsCount > 0 && (
                      <div className="bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <span>🔍</span>
                        <span>
                          {dailyGoalsCount} Daily Goal
                          {dailyGoalsCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Goals to delete section */}
                <div className="space-y-4 border border-border rounded-md p-3 bg-muted">
                  {preview.goalsToDelete.map((goal) => renderGoalTree(goal))}
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDeleteGoals} className="bg-red-500 hover:bg-red-600">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Helper function to count goals by depth
function countGoalsByDepth(goals: GoalPreviewNode[], targetDepth: number): number {
  let count = 0;

  function traverse(goal: GoalPreviewNode) {
    if (goal.depth === targetDepth) {
      count++;
    }

    for (const child of goal.children) {
      traverse(child);
    }
  }

  for (const goal of goals) {
    traverse(goal);
  }

  return count;
}
