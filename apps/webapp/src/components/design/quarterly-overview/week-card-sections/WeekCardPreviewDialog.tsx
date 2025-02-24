import { History, Star, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface PreviewTask {
  id: string;
  title: string;
  details?: string;
  quarterlyGoal: {
    id: string;
    title: string;
    isStarred?: boolean;
    isPinned?: boolean;
  };
  weeklyGoal: {
    id: string;
    title: string;
  };
}

interface WeekCardPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: {
    tasks: Array<PreviewTask>;
  } | null;
  onMoveTasks: () => void;
}

interface IndexedGoal {
  id: string;
  title: string;
  isStarred?: boolean;
  isPinned?: boolean;
}

interface TasksByGoalId {
  [goalId: string]: {
    weeklyGoals: {
      [weeklyId: string]: {
        goal: IndexedGoal;
        tasks: PreviewTask[];
      };
    };
    goal: IndexedGoal;
  };
}

export const WeekCardPreviewDialog = ({
  open,
  onOpenChange,
  preview,
  onMoveTasks,
}: WeekCardPreviewDialogProps) => {
  if (!preview?.tasks.length) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Tasks from Previous Week</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <span className="block">
                  There are no incomplete tasks from the previous week to move
                  to this week.
                </span>
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <span className="block">
                    All tasks from the previous week are complete!
                  </span>
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

  // Index quarterly and weekly goals
  const quarterlyGoals = new Map<string, IndexedGoal>();
  const weeklyGoals = new Map<string, IndexedGoal>();

  // First pass: build indices
  preview.tasks.forEach((task) => {
    if (task.quarterlyGoal?.id && !quarterlyGoals.has(task.quarterlyGoal.id)) {
      quarterlyGoals.set(task.quarterlyGoal.id, {
        id: task.quarterlyGoal.id,
        title: task.quarterlyGoal.title || 'Unknown Quarterly Goal',
        isStarred: task.quarterlyGoal.isStarred || false,
        isPinned: task.quarterlyGoal.isPinned || false,
      });
    }
    if (task.weeklyGoal?.id && !weeklyGoals.has(task.weeklyGoal.id)) {
      weeklyGoals.set(task.weeklyGoal.id, {
        id: task.weeklyGoal.id,
        title: task.weeklyGoal.title || 'Unknown Weekly Goal',
      });
    }
  });

  // Second pass: group tasks by quarterly and weekly goals
  const tasksByGoalId = preview.tasks.reduce<TasksByGoalId>((acc, task) => {
    const quarterlyId = task.quarterlyGoal?.id;
    const weeklyId = task.weeklyGoal?.id;

    // Skip tasks without valid IDs
    if (!quarterlyId || !weeklyId) return acc;

    // Get goals from indices with fallbacks
    const quarterlyGoal = quarterlyGoals.get(quarterlyId) || {
      id: quarterlyId,
      title: 'Unknown Quarterly Goal',
      isStarred: false,
      isPinned: false,
    };
    const weeklyGoal = weeklyGoals.get(weeklyId) || {
      id: weeklyId,
      title: 'Unknown Weekly Goal',
    };

    if (!acc[quarterlyId]) {
      acc[quarterlyId] = {
        goal: quarterlyGoal,
        weeklyGoals: {},
      };
    }

    if (!acc[quarterlyId].weeklyGoals[weeklyId]) {
      acc[quarterlyId].weeklyGoals[weeklyId] = {
        goal: weeklyGoal,
        tasks: [],
      };
    }

    acc[quarterlyId].weeklyGoals[weeklyId].tasks.push(task);
    return acc;
  }, {});

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move Tasks from Previous Week</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <span className="block">
                The following incomplete tasks from the previous week will be
                moved to this week. Note that tasks will be moved, not copied.
              </span>
              <div className="space-y-4">
                {Object.entries(tasksByGoalId).map(
                  ([quarterlyId, quarterlyGroup]) => {
                    // Extra safety check
                    if (!quarterlyGroup?.goal) {
                      console.warn('Missing quarterly group or goal:', {
                        quarterlyId,
                        quarterlyGroup,
                      });
                      return null;
                    }

                    return (
                      <div
                        key={`quarterly-preview-${quarterlyId}`}
                        className="space-y-2"
                      >
                        <h4 className="font-medium text-sm flex items-center gap-1.5">
                          {quarterlyGroup.goal.isStarred && (
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          )}
                          {quarterlyGroup.goal.isPinned && (
                            <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
                          )}
                          <div className="font-semibold text-sm text-gray-800 px-2 py-1 rounded-md break-words">
                            {quarterlyGroup.goal.title}
                          </div>
                        </h4>
                        <div
                          className={cn(
                            'rounded-md overflow-hidden',
                            quarterlyGroup.goal.isStarred
                              ? 'bg-yellow-50 border border-yellow-200'
                              : quarterlyGroup.goal.isPinned
                              ? 'bg-blue-50 border border-blue-200'
                              : ''
                          )}
                        >
                          {Object.entries(quarterlyGroup.weeklyGoals).map(
                            ([weeklyId, weeklyGroup]) => {
                              // Extra safety check
                              if (!weeklyGroup?.goal) {
                                console.warn('Missing weekly group or goal:', {
                                  weeklyId,
                                  weeklyGroup,
                                });
                                return null;
                              }

                              return (
                                <div
                                  key={`weekly-preview-${weeklyId}`}
                                  className="pl-4 space-y-1 py-2"
                                >
                                  <h5 className="text-sm text-muted-foreground">
                                    <div className="font-semibold text-sm text-gray-800 px-2 py-1 rounded-md break-words">
                                      {weeklyGroup.goal.title}
                                    </div>
                                  </h5>
                                  <ul className="space-y-1">
                                    {weeklyGroup.tasks.map((task, index) => (
                                      <li
                                        key={`daily-preview-${task.id}-${index}`}
                                        className="flex items-center gap-2 pl-4"
                                      >
                                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                                        <div className="text-sm break-words">
                                          {task.title}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction onClick={onMoveTasks}>
            Move Tasks
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
