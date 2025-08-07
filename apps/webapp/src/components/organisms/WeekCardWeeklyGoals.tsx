import {
  GoalDetailsContent,
  GoalDetailsPopover,
} from "@/components/molecules/goal-details";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import { GoalWithOptimisticStatus, useWeek } from "@/hooks/useWeek";
import { cn } from "@/lib/utils";
import { Id } from "@services/backend/convex/_generated/dataModel";
import { Edit2 } from "lucide-react";
import { forwardRef, useCallback, useMemo, useState } from "react";
import { CreateGoalInput } from "../atoms/CreateGoalInput";
import { DeleteGoalIconButton } from "./DeleteGoalIconButton";
import { GoalEditPopover } from "../atoms/GoalEditPopover";
import { FireIcon } from "@/components/atoms/FireIcon";
import { useFireGoals } from "@/contexts/GoalStatusContext";
import { GoalWithDetailsAndChildren } from "@services/backend/src/usecase/getWeekDetails";

interface WeekCardWeeklyGoalsProps {
  weekNumber: number;
  year: number;
  quarter: number;
  isLoading?: boolean;
}

// Loading skeleton for weekly goals
const WeeklyGoalsSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-5/6" />
    <Skeleton className="h-10 w-4/5" />
  </div>
);

// Helper function to safely get isComplete from goal
function getIsComplete(goal: GoalWithDetailsAndChildren): boolean {
  // Access isComplete directly from the goal object
  return "isComplete" in goal ? goal.isComplete : false;
}

// Internal component for rendering a weekly goal
const WeeklyGoal = ({
  goal,
  onUpdateTitle,
  onDelete,
}: {
  goal: GoalWithOptimisticStatus;
  onUpdateTitle: (
    goalId: Id<"goals">,
    title: string,
    details?: string
  ) => Promise<void>;
  onDelete: (goalId: Id<"goals">) => Promise<void>;
}) => {
  const { toggleGoalCompletion, weekNumber } = useWeek();
  const { fireGoals, toggleFireStatus } = useFireGoals();
  const isComplete = getIsComplete(goal);
  const [showUpdateChildrenDialog, setShowUpdateChildrenDialog] =
    useState(false);
  const [pendingCompletionState, setPendingCompletionState] = useState<
    boolean | null
  >(null);

  // Calculate if all children are complete
  const isSoftComplete =
    goal.children.length > 0 &&
    goal.children.every((child) => getIsComplete(child));

  const isOnFire = fireGoals.has(goal._id.toString());

  const handleToggleCompletion = async (newState: boolean) => {
    // If toggling to complete and there are incomplete children, show dialog
    if (newState && goal.children.length > 0) {
      const hasIncompleteChildren = goal.children.some(
        (child) => !getIsComplete(child)
      );
      if (hasIncompleteChildren) {
        setPendingCompletionState(newState);
        setShowUpdateChildrenDialog(true);
        return;
      }
    }

    // Otherwise, just update without children
    await toggleGoalCompletion({
      goalId: goal._id,
      weekNumber,
      isComplete: newState,
      updateChildren: false,
    });
  };

  const handleConfirmUpdateChildren = async () => {
    if (pendingCompletionState !== null) {
      await toggleGoalCompletion({
        goalId: goal._id,
        weekNumber,
        isComplete: pendingCompletionState,
        updateChildren: true,
      });
      setPendingCompletionState(null);
      setShowUpdateChildrenDialog(false);
    }
  };

  const handleCancelUpdateChildren = async () => {
    if (pendingCompletionState !== null) {
      await toggleGoalCompletion({
        goalId: goal._id,
        weekNumber,
        isComplete: pendingCompletionState,
        updateChildren: false,
      });
      setPendingCompletionState(null);
      setShowUpdateChildrenDialog(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group rounded-sm",
          isSoftComplete ? "bg-green-50" : "hover:bg-gray-50/50"
        )}
      >
        <div className="px-2 py-1">
          <div className="text-sm flex items-center gap-2 group/title">
            <Checkbox
              checked={isComplete}
              onCheckedChange={(checked) =>
                handleToggleCompletion(checked === true)
              }
              className="flex-shrink-0"
            />

            {/* View Mode */}
            <GoalDetailsPopover
              goal={goal}
              onSave={async (title, details) => {
                await onUpdateTitle(goal._id, title, details);
              }}
              triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full"
              onToggleComplete={handleToggleCompletion}
            />

            <div className="flex items-center gap-1">
              {goal.isOptimistic ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <>
                  <FireIcon goalId={goal._id} />
                  <GoalEditPopover
                    title={goal.title}
                    details={goal.details}
                    onSave={async (title, details) => {
                      await onUpdateTitle(goal._id, title, details);
                    }}
                    trigger={
                      <button className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-foreground">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    }
                  />
                  <DeleteGoalIconButton
                    requireConfirmation={goal.children.length > 0}
                    goalId={goal._id}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Update Children Dialog */}
      <AlertDialog
        open={showUpdateChildrenDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelUpdateChildren();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Child Goals</AlertDialogTitle>
            <AlertDialogDescription>
              This goal has incomplete child goals. Would you like to mark all
              child goals as complete as well?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelUpdateChildren}>
              No, just this goal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpdateChildren}>
              Yes, update all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const WeeklyGoalGroup = ({
  quarterlyGoal,
  weeklyGoals,
  onUpdateTitle,
  onDelete,
}: {
  quarterlyGoal: GoalWithOptimisticStatus;
  weeklyGoals: GoalWithOptimisticStatus[];
  onUpdateTitle: (
    goalId: Id<"goals">,
    title: string,
    details?: string
  ) => Promise<void>;
  onDelete: (goalId: Id<"goals">) => Promise<void>;
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [previousTitle, setPreviousTitle] = useState(""); // Store previous title for error recovery
  const { createWeeklyGoalOptimistic } = useWeek();
  const { toast } = useToast();

  const handleSubmit = async () => {
    const trimmedTitle = newGoalTitle.trim();
    if (!trimmedTitle) return;

    // Store the current title for potential error recovery
    setPreviousTitle(trimmedTitle);
    // Clear input immediately
    setNewGoalTitle("");

    try {
      await createWeeklyGoalOptimistic(quarterlyGoal._id, trimmedTitle);
      // Success - input is already cleared
    } catch (error) {
      // Restore the previous title
      setNewGoalTitle(previousTitle);
      // Show error toast
      toast({
        variant: "destructive",
        title: "Failed to create goal",
        description: "There was an error creating your goal. Please try again.",
      });
      console.error("Failed to create weekly goal:", error);
    }
  };

  const handleEscape = () => {
    setIsCreating(false);
    setNewGoalTitle(""); // Clear the input
    setPreviousTitle(""); // Clear the stored title
  };

  return (
    <div className="space-y-1">
      {weeklyGoals.map((weeklyGoal) => (
        <WeeklyGoal
          key={weeklyGoal._id}
          goal={weeklyGoal}
          onUpdateTitle={onUpdateTitle}
          onDelete={onDelete}
        />
      ))}
      <div
        className="px-2 py-1"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => !isCreating && setIsHovering(false)}
      >
        <div
          className={cn(
            "transition-opacity duration-150",
            isCreating || isHovering
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          )}
        >
          <CreateGoalInput
            placeholder="Add a weekly goal..."
            value={newGoalTitle}
            onChange={setNewGoalTitle}
            onSubmit={handleSubmit}
            onEscape={handleEscape}
            onFocus={() => setIsCreating(true)}
            onBlur={() => {
              if (!newGoalTitle) {
                setIsCreating(false);
                setIsHovering(false);
              }
            }}
            autoFocus={isCreating}
          />
        </div>
      </div>
    </div>
  );
};

export const WeekCardWeeklyGoals = forwardRef<
  HTMLDivElement,
  WeekCardWeeklyGoalsProps
>(({ weekNumber, year, quarter, isLoading = false }, ref) => {
  const {
    updateQuarterlyGoalTitle,
    quarterlyGoals,
    deleteGoalOptimistic,
    toggleGoalCompletion,
  } = useWeek();

  // Filter and sort important quarterly goals
  const importantQuarterlyGoals = useMemo(() => {
    return quarterlyGoals
      .filter((goal) => goal.state?.isStarred || goal.state?.isPinned)
      .sort((a, b) => {
        // First by starred status
        if (a.state?.isStarred && !b.state?.isStarred) return -1;
        if (!a.state?.isStarred && b.state?.isStarred) return 1;
        // Then by pinned status
        if (a.state?.isPinned && !b.state?.isPinned) return -1;
        if (!a.state?.isPinned && b.state?.isPinned) return 1;
        // Finally alphabetically
        return a.title.localeCompare(b.title);
      });
  }, [quarterlyGoals]);

  const handleUpdateWeeklyGoalTitle = useCallback(
    async (goalId: Id<"goals">, title: string, details?: string) => {
      try {
        await updateQuarterlyGoalTitle({
          goalId,
          title,
          details,
        });
      } catch (error) {
        console.error("Failed to update weekly goal title:", error);
        throw error;
      }
    },
    [updateQuarterlyGoalTitle]
  );

  const handleDeleteWeeklyGoal = useCallback(
    async (goalId: Id<"goals">) => {
      try {
        await deleteGoalOptimistic(goalId);
      } catch (error) {
        console.error("Failed to delete weekly goal:", error);
        throw error;
      }
    },
    [deleteGoalOptimistic]
  );

  // Move handleToggleQuarterlyCompletion outside the map function
  const handleToggleQuarterlyCompletion = useCallback(
    async (goalId: Id<"goals">, newState: boolean) => {
      await toggleGoalCompletion({
        goalId,
        weekNumber,
        isComplete: newState,
        updateChildren: false,
      });
    },
    [weekNumber, toggleGoalCompletion]
  );

  // If loading, show skeleton
  if (isLoading) {
    return <WeeklyGoalsSkeleton />;
  }

  return (
    <div className="space-y-4" ref={ref}>
      {importantQuarterlyGoals.length === 0 ? (
        <div className="text-sm text-muted-foreground italic px-3">
          No starred or pinned quarterly goals
        </div>
      ) : (
        <div className="space-y-2">
          {importantQuarterlyGoals.map((goal) => {
            const weeklyGoals = goal.children;
            const isStarred = goal.state?.isStarred ?? false;
            const isPinned = goal.state?.isPinned ?? false;
            const isComplete = getIsComplete(goal);
            const isAllWeeklyGoalsComplete =
              weeklyGoals.length > 0 &&
              weeklyGoals.every((goal) => getIsComplete(goal));

            return (
              <div
                key={goal._id}
                className={cn(
                  "px-3 space-y-2 rounded-md",
                  isAllWeeklyGoalsComplete ? "bg-green-50" : ""
                )}
              >
                <div
                  className={cn(
                    "font-semibold text-sm text-gray-800 px-2 py-1 rounded-md",
                    !isAllWeeklyGoalsComplete &&
                      (isStarred ? "bg-yellow-50" : isPinned && "bg-blue-50")
                  )}
                >
                  <GoalDetailsPopover
                    goal={goal}
                    onSave={async (title, details) => {
                      await handleUpdateWeeklyGoalTitle(
                        goal._id,
                        title,
                        details
                      );
                    }}
                    triggerClassName="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full font-semibold"
                    onToggleComplete={(newState) =>
                      handleToggleQuarterlyCompletion(goal._id, newState)
                    }
                  />
                </div>
                <WeeklyGoalGroup
                  quarterlyGoal={goal}
                  weeklyGoals={weeklyGoals}
                  onUpdateTitle={handleUpdateWeeklyGoalTitle}
                  onDelete={handleDeleteWeeklyGoal}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
WeekCardWeeklyGoals.displayName = "WeekCardWeeklyGoals";
