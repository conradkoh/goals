import { History, Star, Pin, Calendar, ArrowRightLeft } from 'lucide-react';
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
import { Id } from '@services/backend/convex/_generated/dataModel';
import { DayOfWeek, getDayName } from '@services/backend/src/constants';

interface DailyGoalToCopy {
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
    consolidateToDayOfWeek?: DayOfWeek;
  };
}

interface WeekStateToCopy {
  title: string;
  carryOver: {
    type: 'week';
    numWeeks: number;
    fromGoal: {
      previousGoalId: Id<'goals'>;
      rootGoalId: Id<'goals'>;
    };
  };
  dailyGoalsCount: number;
  quarterlyGoalId?: Id<'goals'>;
}

interface WeekCardPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: {
    tasks: Array<DailyGoalToCopy>;
    weeklyGoals: Array<WeekStateToCopy>;
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
        tasks: DailyGoalToCopy[];
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
  if (!preview?.tasks.length && !preview?.weeklyGoals.length) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Tasks from Previous Week</AlertDialogTitle>
            <AlertDialogDescription asChild>
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

  // Add weekly goals from weekStates
  preview.weeklyGoals.forEach((weeklyGoal) => {
    const id = weeklyGoal.carryOver.fromGoal.previousGoalId;
    if (!weeklyGoals.has(id)) {
      weeklyGoals.set(id, {
        id,
        title: weeklyGoal.title,
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

  // Check if we're consolidating to a specific day
  const isConsolidating = preview?.tasks.some(
    (task) =>
      task.weeklyGoal && task.weeklyGoal.consolidateToDayOfWeek !== undefined
  );

  const consolidationDay =
    isConsolidating && preview?.tasks.length > 0
      ? preview.tasks[0].weeklyGoal.consolidateToDayOfWeek
      : undefined;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move Tasks from Previous Week</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-6 max-h-[50vh] overflow-y-auto">
              {/* Explanation section */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">What will happen:</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    {isConsolidating ? (
                      <>
                        <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <p className="text-sm">
                          Daily goals will be consolidated to{' '}
                          <span className="font-medium">
                            {getDayName(consolidationDay!)}
                          </span>
                        </p>
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <p className="text-sm">
                          Daily goals will preserve their original day of the
                          week
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 flex-shrink-0 mt-0.5">
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">
                        Quarterly Goals
                      </span>{' '}
                      will remain unaffected, but their pinned and starred
                      status will be copied to this week
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 flex-shrink-0 mt-0.5">
                      <History className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">
                        Weekly Goals
                      </span>{' '}
                      that are incomplete will be copied to this week with a new
                      instance
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 flex-shrink-0 mt-0.5">
                      <Calendar className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">
                        Daily Goals
                      </span>{' '}
                      that are incomplete will be moved to this week
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm">
                  The following items will be affected:
                </h3>

                {/* Quarterly Goals Section */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Quarterly Goals</h4>
                  <div className="space-y-2">
                    {Array.from(quarterlyGoals.values()).map((goal) => (
                      <div
                        key={`quarterly-${goal.id}`}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50"
                      >
                        {goal.isStarred && (
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        )}
                        {goal.isPinned && (
                          <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
                        )}
                        <div className="font-medium text-sm text-gray-800 break-words">
                          {goal.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weekly Goals Section */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Weekly Goals</h4>
                  <div className="space-y-2">
                    {Array.from(weeklyGoals.values()).map((goal) => {
                      // Find the corresponding weekly goal in weekStates
                      const weeklyGoalToCopy = preview.weeklyGoals.find(
                        (wg) => wg.carryOver.fromGoal.previousGoalId === goal.id
                      );

                      return (
                        <div
                          key={`weekly-${goal.id}`}
                          className="px-2 py-1 rounded-md bg-gray-50"
                        >
                          <div className="font-medium text-sm text-gray-800 break-words">
                            {goal.title}
                            {weeklyGoalToCopy && (
                              <span className="text-xs text-gray-500 ml-2">
                                (Week {weeklyGoalToCopy.carryOver.numWeeks})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Daily Goals Section (Nested under Quarterly and Weekly) */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Daily Goals</h4>
                  <div className="space-y-4">
                    {Object.entries(tasksByGoalId).map(
                      ([quarterlyId, quarterlyGroup]) => {
                        if (!quarterlyGroup?.goal) return null;

                        return (
                          <div
                            key={`quarterly-preview-${quarterlyId}`}
                            className="space-y-2"
                          >
                            <h5 className="font-semibold text-sm flex items-center gap-1.5">
                              {quarterlyGroup.goal.isStarred && (
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                              )}
                              {quarterlyGroup.goal.isPinned && (
                                <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
                              )}
                              <div className="font-semibold text-sm text-gray-800 px-2 py-1 rounded-md break-words">
                                {quarterlyGroup.goal.title}
                              </div>
                            </h5>
                            <div
                              className={cn(
                                'rounded-md overflow-hidden',
                                quarterlyGroup.goal.isStarred
                                  ? 'bg-yellow-50 border border-yellow-200'
                                  : quarterlyGroup.goal.isPinned
                                  ? 'bg-blue-50 border border-blue-200'
                                  : 'bg-gray-50 border border-gray-200'
                              )}
                            >
                              {Object.entries(quarterlyGroup.weeklyGoals).map(
                                ([weeklyId, weeklyGroup]) => {
                                  if (!weeklyGroup?.goal) return null;

                                  // Find the corresponding weekly goal in weekStates
                                  const weeklyGoalToCopy =
                                    preview.weeklyGoals.find(
                                      (wg) =>
                                        wg.carryOver.fromGoal.previousGoalId ===
                                        weeklyId
                                    );

                                  return (
                                    <div
                                      key={`weekly-preview-${weeklyId}`}
                                      className="pl-4 space-y-1 py-2"
                                    >
                                      <h6 className="text-sm text-muted-foreground">
                                        <div className="font-semibold text-sm text-gray-800 px-2 py-1 rounded-md break-words">
                                          {weeklyGroup.goal.title}
                                          {weeklyGoalToCopy && (
                                            <span className="text-xs text-gray-500 ml-2">
                                              (Week{' '}
                                              {
                                                weeklyGoalToCopy.carryOver
                                                  .numWeeks
                                              }
                                              )
                                            </span>
                                          )}
                                        </div>
                                      </h6>
                                      <ul className="space-y-1">
                                        {weeklyGroup.tasks.map(
                                          (task, index) => (
                                            <li
                                              key={`daily-preview-${task.id}-${index}`}
                                              className="flex items-center gap-2 pl-4"
                                            >
                                              <span className="h-2 w-2 rounded-full bg-blue-500" />
                                              <div className="text-sm break-words">
                                                {task.title}
                                              </div>
                                            </li>
                                          )
                                        )}
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
