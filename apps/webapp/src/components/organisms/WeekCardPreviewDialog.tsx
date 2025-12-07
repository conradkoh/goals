import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { type DayOfWeek, getDayName } from '@workspace/backend/src/constants';
import { AlertCircle, ArrowRightLeft, Calendar, History, Pin, Star } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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

interface AdhocGoalToCopy {
  id: string;
  title: string;
  domainId?: string;
  domainName?: string;
  dayOfWeek?: DayOfWeek;
  dueDate?: number;
}

interface SkippedGoal {
  id: string;
  title: string;
  reason: 'already_moved';
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
    tasks: DailyGoalToCopy[];
    weeklyGoals: WeekStateToCopy[];
    quarterlyGoals?: {
      id: string;
      title: string;
      isStarred?: boolean;
      isPinned?: boolean;
    }[];
    adhocGoals?: AdhocGoalToCopy[];
    skippedGoals?: SkippedGoal[];
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

// Extracted component for rendering goal lists to avoid duplication
const GoalListSection = ({
  quarterlyGoals,
  weeklyGoals,
  tasksByGoalId,
  adhocGoals,
  weeklyGoalsData,
}: {
  quarterlyGoals: Map<string, IndexedGoal>;
  weeklyGoals: Map<string, IndexedGoal>;
  tasksByGoalId: TasksByGoalId;
  adhocGoals?: AdhocGoalToCopy[];
  weeklyGoalsData?: WeekStateToCopy[];
}) => {
  return (
    <div className="space-y-4">
      {/* Quarterly Goals Section */}
      {quarterlyGoals.size > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-foreground">Quarterly Goals</h4>
          <div className="space-y-2">
            {Array.from(quarterlyGoals.values()).map((goal) => (
              <div
                key={`quarterly-${goal.id}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted dark:bg-muted/50"
              >
                {goal.isStarred && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
                {goal.isPinned && <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />}
                <div className="font-medium text-sm text-foreground break-words">{goal.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Goals Section */}
      {weeklyGoals.size > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-foreground">Weekly Goals</h4>
          <div className="space-y-2">
            {Array.from(weeklyGoals.values()).map((goal) => {
              const weeklyGoalToCopy = (weeklyGoalsData ?? []).find(
                (wg) => wg.carryOver.fromGoal.previousGoalId === goal.id
              );

              return (
                <div
                  key={`weekly-${goal.id}`}
                  className="px-2 py-1 rounded-md bg-muted dark:bg-muted/50"
                >
                  <div className="font-medium text-sm text-foreground break-words">
                    {goal.title}
                    {weeklyGoalToCopy && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Week {weeklyGoalToCopy.carryOver.numWeeks})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Goals Section */}
      {Object.keys(tasksByGoalId).length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-foreground">Daily Goals</h4>
          <div className="space-y-4">
            {Object.entries(tasksByGoalId).map(([quarterlyId, quarterlyGroup]) => {
              if (!quarterlyGroup?.goal) return null;

              return (
                <div key={`quarterly-preview-${quarterlyId}`} className="space-y-2">
                  <h5 className="font-semibold text-sm flex items-center gap-1.5">
                    {quarterlyGroup.goal.isStarred && (
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    )}
                    {quarterlyGroup.goal.isPinned && (
                      <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
                    )}
                    <div className="font-semibold text-sm text-foreground px-2 py-1 rounded-md break-words">
                      {quarterlyGroup.goal.title}
                    </div>
                  </h5>
                  <div
                    className={cn(
                      'rounded-md overflow-hidden border',
                      quarterlyGroup.goal.isStarred
                        ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                        : quarterlyGroup.goal.isPinned
                          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                          : 'bg-muted dark:bg-muted/50 border-border'
                    )}
                  >
                    {Object.entries(quarterlyGroup.weeklyGoals).map(([weeklyId, weeklyGroup]) => {
                      if (!weeklyGroup?.goal) return null;

                      const weeklyGoalToCopy = (weeklyGoalsData ?? []).find(
                        (wg) => wg.carryOver.fromGoal.previousGoalId === weeklyId
                      );

                      return (
                        <div key={`weekly-preview-${weeklyId}`} className="pl-4 space-y-1 py-2">
                          <h6 className="text-sm text-muted-foreground">
                            <div className="font-semibold text-sm text-foreground px-2 py-1 rounded-md break-words">
                              {weeklyGroup.goal.title}
                              {weeklyGoalToCopy && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  (Week {weeklyGoalToCopy.carryOver.numWeeks})
                                </span>
                              )}
                            </div>
                          </h6>
                          <ul className="space-y-1">
                            {weeklyGroup.tasks.map((task, index) => (
                              <li
                                key={`daily-preview-${task.id}-${index}`}
                                className="flex items-center gap-2 pl-4"
                              >
                                <span className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                                <div className="text-sm text-foreground break-words">
                                  {task.title}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Adhoc Goals Section */}
      {(adhocGoals?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-foreground">Adhoc Tasks</h4>
          <div className="space-y-2">
            {(adhocGoals ?? []).map((adhocGoal) => (
              <div
                key={`adhoc-${adhocGoal.id}`}
                className="px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500 dark:bg-purple-400" />
                  <div className="font-medium text-sm text-foreground break-words flex-1">
                    {adhocGoal.title}
                  </div>
                  {adhocGoal.domainName && (
                    <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded">
                      {adhocGoal.domainName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const WeekCardPreviewDialog = ({
  open,
  onOpenChange,
  preview,
  onMoveTasks,
}: WeekCardPreviewDialogProps) => {
  const hasItemsToMove =
    (preview?.tasks.length ?? 0) > 0 ||
    (preview?.weeklyGoals.length ?? 0) > 0 ||
    (preview?.quarterlyGoals?.length ?? 0) > 0 ||
    (preview?.adhocGoals?.length ?? 0) > 0;

  const hasSkippedGoals = (preview?.skippedGoals?.length ?? 0) > 0;

  if (!hasItemsToMove && !hasSkippedGoals) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Tasks from Last Non-Empty Week</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <span className="block">
                  There are no incomplete tasks from the last non-empty week to move to this week.
                </span>
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <span className="block">
                    All tasks from the last non-empty week are complete!
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

  // Seed from explicit quarterly goals in preview (quarterly-only updates)
  (preview?.quarterlyGoals ?? []).forEach((q) => {
    quarterlyGoals.set(q.id, {
      id: q.id,
      title: q.title || 'Unknown Quarterly Goal',
      isStarred: q.isStarred || false,
      isPinned: q.isPinned || false,
    });
  });

  // First pass: build indices from tasks
  preview?.tasks.forEach((task) => {
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
  (preview?.weeklyGoals ?? []).forEach((weeklyGoal) => {
    const id = weeklyGoal.carryOver.fromGoal.previousGoalId;
    if (!weeklyGoals.has(id)) {
      weeklyGoals.set(id, {
        id,
        title: weeklyGoal.title,
      });
    }
  });

  // Second pass: group tasks by quarterly and weekly goals
  const tasksByGoalId = (preview?.tasks ?? []).reduce<TasksByGoalId>((acc, task) => {
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
  }, {} as TasksByGoalId);

  // Check if we're consolidating to a specific day
  const isConsolidating = preview?.tasks.some(
    (task) => task.weeklyGoal && task.weeklyGoal.consolidateToDayOfWeek !== undefined
  );

  const consolidationDay =
    isConsolidating && preview?.tasks && preview.tasks.length > 0
      ? preview.tasks[0].weeklyGoal.consolidateToDayOfWeek
      : undefined;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Move Tasks from Last Non-Empty Week</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Explanation section */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-foreground">What will happen:</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    {isConsolidating ? (
                      <>
                        <Calendar className="h-4 w-4 mt-0.5" />
                        <p>
                          Daily goals will be consolidated to{' '}
                          <span className="font-medium text-foreground">
                            {consolidationDay ? getDayName(consolidationDay) : 'the selected day'}
                          </span>
                        </p>
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="h-4 w-4 mt-0.5" />
                        <p>Daily goals will preserve their original day of the week</p>
                      </>
                    )}
                  </div>
                  {hasSkippedGoals && (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-orange-500" />
                      <p>
                        <span className="font-medium text-foreground">
                          Some goals will be skipped
                        </span>{' '}
                        because they were already moved to this week
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs for To Move vs Skipped */}
              <Tabs defaultValue="to-move" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="to-move">
                    To Move (
                    {(preview?.weeklyGoals.length ?? 0) +
                      (preview?.tasks.length ?? 0) +
                      (preview?.adhocGoals?.length ?? 0)}
                    )
                  </TabsTrigger>
                  <TabsTrigger value="skipped" disabled={!hasSkippedGoals}>
                    Skipped ({preview?.skippedGoals?.length ?? 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="to-move" className="max-h-[50vh] overflow-y-auto mt-4">
                  <GoalListSection
                    quarterlyGoals={quarterlyGoals}
                    weeklyGoals={weeklyGoals}
                    tasksByGoalId={tasksByGoalId}
                    adhocGoals={preview?.adhocGoals}
                    weeklyGoalsData={preview?.weeklyGoals}
                  />
                </TabsContent>

                <TabsContent value="skipped" className="max-h-[50vh] overflow-y-auto mt-4">
                  {hasSkippedGoals ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                        <p className="text-sm text-orange-900 dark:text-orange-100">
                          These goals already exist in this week and will not be moved again.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-foreground">
                          Skipped Weekly Goals
                        </h4>
                        <div className="space-y-2">
                          {(preview?.skippedGoals ?? []).map((goal) => (
                            <div
                              key={`skipped-${goal.id}`}
                              className="px-2 py-1 rounded-md bg-muted dark:bg-muted/50 border border-border"
                            >
                              <div className="font-medium text-sm text-muted-foreground break-words">
                                {goal.title}
                                <span className="text-xs ml-2">
                                  (Week {goal.carryOver.numWeeks})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No goals will be skipped</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction onClick={onMoveTasks} disabled={!hasItemsToMove}>
            Move Tasks
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
