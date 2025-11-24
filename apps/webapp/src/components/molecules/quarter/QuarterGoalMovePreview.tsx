import { ArrowRightLeft, Calendar, History, Loader2, Pin, Star } from 'lucide-react';
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
import type {
  AdhocGoalToCopy,
  DailyGoalToCopy,
  QuarterlyGoalToCopy,
  WeeklyGoalToCopy,
} from '@/hooks/useMoveGoalsForQuarter';
import { cn } from '@/lib/utils';

interface QuarterGoalMovePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: {
    quarterlyGoals: QuarterlyGoalToCopy[];
    weeklyGoals: WeeklyGoalToCopy[];
    dailyGoals: DailyGoalToCopy[];
    adhocGoals?: AdhocGoalToCopy[];
  } | null;
  onConfirm: () => void;
  isConfirming?: boolean;
}

// Type for the indexed goals to create the hierarchy
interface IndexedGoal {
  id: string;
  title: string;
  details?: string;
  isStarred?: boolean;
  isPinned?: boolean;
}

export const QuarterGoalMovePreview = ({
  open,
  onOpenChange,
  preview,
  onConfirm,
  isConfirming = false,
}: QuarterGoalMovePreviewProps) => {
  const hasQuarterlyGoals = preview?.quarterlyGoals && preview.quarterlyGoals.length > 0;
  const hasWeeklyGoals = preview?.weeklyGoals && preview.weeklyGoals.length > 0;
  const hasDailyGoals = preview?.dailyGoals && preview.dailyGoals.length > 0;
  const hasAdhocGoals = preview?.adhocGoals && preview.adhocGoals.length > 0;
  const hasContent = hasQuarterlyGoals || hasWeeklyGoals || hasDailyGoals || hasAdhocGoals;

  // No content to show
  if (!hasContent) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pull Goals from Previous Quarter</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <span className="block">
                  There are no incomplete goals from the previous quarter to move to this quarter.
                </span>
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <span className="block">All goals from the previous quarter are complete!</span>
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

  // Index quarterly and weekly goals for hierarchical display
  const quarterlyGoals = new Map<string, IndexedGoal>();
  const weeklyGoals = new Map<string, IndexedGoal>();

  // Index all quarterly goals
  if (preview?.quarterlyGoals) {
    preview.quarterlyGoals.forEach((goal) => {
      quarterlyGoals.set(goal.id.toString(), {
        id: goal.id.toString(),
        title: goal.title,
        details: goal.details,
        isStarred: goal.isStarred,
        isPinned: goal.isPinned,
      });
    });
  }

  // Index all weekly goals
  if (preview?.weeklyGoals) {
    preview.weeklyGoals.forEach((goal) => {
      weeklyGoals.set(goal.id.toString(), {
        id: goal.id.toString(),
        title: goal.title,
        details: goal.details,
      });
    });
  }

  // Create a mapping of weekly goals to their quarterly parents
  const weeklyToQuarterlyMap = new Map<string, string>();
  preview?.weeklyGoals.forEach((goal) => {
    weeklyToQuarterlyMap.set(goal.id.toString(), goal.quarterlyGoalId.toString());
  });

  // Create a mapping of daily goals to their weekly parents
  const dailyToWeeklyMap = new Map<string, string>();
  preview?.dailyGoals.forEach((goal) => {
    dailyToWeeklyMap.set(goal.id.toString(), goal.weeklyGoalId.toString());
  });

  // Group daily goals by their weekly parent
  const dailyGoalsByWeekly = new Map<string, DailyGoalToCopy[]>();
  preview?.dailyGoals.forEach((goal) => {
    const weeklyId = goal.weeklyGoalId.toString();
    if (!dailyGoalsByWeekly.has(weeklyId)) {
      dailyGoalsByWeekly.set(weeklyId, []);
    }
    dailyGoalsByWeekly.get(weeklyId)?.push(goal);
  });

  // Group weekly goals by their quarterly parent
  const weeklyGoalsByQuarterly = new Map<string, WeeklyGoalToCopy[]>();
  preview?.weeklyGoals.forEach((goal) => {
    const quarterlyId = goal.quarterlyGoalId.toString();
    if (!weeklyGoalsByQuarterly.has(quarterlyId)) {
      weeklyGoalsByQuarterly.set(quarterlyId, []);
    }
    weeklyGoalsByQuarterly.get(quarterlyId)?.push(goal);
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Pull Goals from Previous Quarter</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-6">
              {/* Explanation section */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">What will happen:</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <ArrowRightLeft className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <p className="text-sm">
                      All hierarchies and relationships between goals will be preserved
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 flex-shrink-0 mt-0.5">
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">Quarterly Goals</span> that are
                      incomplete will be copied to this quarter with their pinned and starred status
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 flex-shrink-0 mt-0.5">
                      <History className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">Weekly Goals</span> that are
                      incomplete from the final week of the previous quarter (e.g., week 13 for Q1)
                      will be copied to this quarter with their weekly assignments
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 flex-shrink-0 mt-0.5">
                      <Calendar className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">Daily Goals</span> that are
                      associated with moved weekly goals from the final week and are incomplete will
                      be copied with their day assignments
                    </p>
                  </div>
                  {hasAdhocGoals && (
                    <div className="flex items-start gap-2">
                      <div className="h-5 w-5 flex-shrink-0 mt-0.5">
                        <Calendar className="h-4 w-4 text-purple-500" />
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-900">Adhoc Tasks</span> that are
                        incomplete will be moved to the first week of this quarter
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview of goals to move */}
              <div className="space-y-4">
                {Array.from(quarterlyGoals.values()).map((quarterlyGoal) => (
                  <div key={quarterlyGoal.id} className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-1.5">
                      {quarterlyGoal.isStarred && (
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      )}
                      {quarterlyGoal.isPinned && (
                        <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
                      )}
                      <div className="font-semibold text-sm text-gray-800 px-2 py-1 rounded-md break-words">
                        {quarterlyGoal.title}
                      </div>
                    </h4>

                    <div
                      className={cn(
                        'rounded-md overflow-hidden',
                        quarterlyGoal.isStarred
                          ? 'bg-yellow-50 border border-yellow-200'
                          : quarterlyGoal.isPinned
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-gray-50 border border-gray-200'
                      )}
                    >
                      {/* Weekly goals under this quarterly goal */}
                      {weeklyGoalsByQuarterly.get(quarterlyGoal.id)?.map((weeklyGoal) => (
                        <div key={weeklyGoal.id.toString()} className="pl-4 space-y-1 py-2">
                          <h5 className="text-sm text-muted-foreground">
                            <div className="font-semibold text-sm text-gray-800 px-2 py-1 rounded-md break-words">
                              {weeklyGoal.title}
                            </div>
                          </h5>

                          {/* Daily goals under this weekly goal */}
                          {(() => {
                            const dailyGoals = dailyGoalsByWeekly.get(weeklyGoal.id.toString());
                            return dailyGoals && dailyGoals.length > 0 ? (
                              <ul className="space-y-1">
                                {dailyGoals.map((dailyGoal) => (
                                  <li
                                    key={dailyGoal.id.toString()}
                                    className="flex items-center gap-2 pl-4"
                                  >
                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                    <div className="text-sm break-words">{dailyGoal.title}</div>
                                  </li>
                                ))}
                              </ul>
                            ) : null;
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Adhoc Goals Section */}
                {hasAdhocGoals && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Adhoc Tasks</h4>
                    <div className="space-y-2">
                      {(preview?.adhocGoals ?? []).map((adhocGoal) => (
                        <div
                          key={adhocGoal.id}
                          className="px-2 py-1 rounded-md bg-purple-50 border border-purple-200"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-purple-500" />
                            <div className="font-medium text-sm text-gray-800 break-words flex-1">
                              {adhocGoal.title}
                            </div>
                            {adhocGoal.domainName && (
                              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
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
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isConfirming}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!hasContent || isConfirming}
            className="min-w-[140px]"
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Moving...
              </>
            ) : (
              'Pull Selected Goals'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
