import { useDashboard } from '@/hooks/useDashboard';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Edit2, Focus } from 'lucide-react';
import {
  useState,
  useMemo,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { CreateGoalInput } from '../../goals-new/CreateGoalInput';
import { useWeek } from '@/hooks/useWeek';
import { GoalSelector } from '../../goals-new/GoalSelector';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SafeHTML } from '@/components/ui/safe-html';
import { DeleteGoalIconButton } from '../../goals-new/DeleteGoalIconButton';
import { GoalEditPopover } from '../../goals-new/GoalEditPopover';
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
import { WeekCardDailyGoals } from './WeekCardDailyGoals';
import { Dialog, DialogPortal, DialogTrigger } from '@/components/ui/dialog';

interface WeekCardWeeklyGoalsProps {
  weekNumber: number;
}

export interface WeekCardWeeklyGoalsRef {
  openFocusMode: () => void;
}

// Internal component for rendering a weekly goal
const WeeklyGoal = ({
  goal,
  onUpdateTitle,
  onDelete,
}: {
  goal: GoalWithDetailsAndChildren;
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
}) => {
  const { toggleGoalCompletion } = useDashboard();
  const { weekNumber } = useWeek();
  const isComplete = goal.state?.isComplete ?? false;
  const isStarred = goal.state?.isStarred ?? false;
  const isPinned = goal.state?.isPinned ?? false;
  const [showUpdateChildrenDialog, setShowUpdateChildrenDialog] =
    useState(false);
  const [pendingCompletionState, setPendingCompletionState] = useState<
    boolean | null
  >(null);

  // Calculate if all children are complete
  const isSoftComplete =
    goal.children.length > 0 &&
    goal.children.every((child) => child.state?.isComplete);

  const handleToggleCompletion = async (newState: boolean) => {
    // If toggling to complete and there are incomplete children, show dialog
    if (newState && goal.children.length > 0) {
      const hasIncompleteChildren = goal.children.some(
        (child) => !(child.state?.isComplete ?? false)
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
          'group rounded-sm',
          isSoftComplete ? 'bg-green-50' : 'hover:bg-gray-50/50'
        )}
      >
        <div className="px-2 py-1">
          <div className="text-sm flex items-center gap-2 group/title">
            <input
              type="checkbox"
              checked={isComplete}
              onChange={(e) => handleToggleCompletion(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />

            {/* View Mode */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0"
                >
                  <span className="truncate">{goal.title}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{goal.title}</h3>
                    <GoalEditPopover
                      title={goal.title}
                      details={goal.details}
                      onSave={async (title, details) => {
                        await onUpdateTitle(goal._id, title, details);
                      }}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                  {goal.details && (
                    <SafeHTML html={goal.details} className="mt-2 text-sm" />
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-1">
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
              <DeleteGoalIconButton onDelete={() => onDelete(goal._id)} />
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
  onCreateGoal,
  onUpdateTitle,
  onDelete,
}: {
  quarterlyGoal: GoalWithDetailsAndChildren;
  weeklyGoals: GoalWithDetailsAndChildren[];
  onCreateGoal: (title: string) => Promise<void>;
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');

  const handleSubmit = async () => {
    if (!newGoalTitle.trim()) return;
    await onCreateGoal(newGoalTitle);
    setNewGoalTitle('');
    // Don't hide the input after submission to allow for multiple entries
  };

  const handleEscape = () => {
    setIsCreating(false);
    setNewGoalTitle(''); // Clear the input
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
            'transition-opacity duration-150',
            isCreating || isHovering
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
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

// New FocusWeeklyGoalGroup component for focus mode
const FocusWeeklyGoalGroup = ({
  quarterlyGoal,
  weeklyGoals,
  onUpdateTitle,
  onDelete,
}: {
  quarterlyGoal: GoalWithDetailsAndChildren;
  weeklyGoals: GoalWithDetailsAndChildren[];
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
}) => {
  return (
    <div className="space-y-1">
      <div className="font-medium text-sm text-gray-800 mb-2">
        {quarterlyGoal.title}
      </div>
      {weeklyGoals.map((weeklyGoal) => (
        <WeeklyGoal
          key={weeklyGoal._id}
          goal={weeklyGoal}
          onUpdateTitle={onUpdateTitle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

// WeeklyGoalsFocusMode component
const WeeklyGoalsFocusMode = ({
  weekNumber,
  onClose,
}: {
  weekNumber: number;
  onClose: () => void;
}) => {
  const { updateQuarterlyGoalTitle, deleteQuarterlyGoal } = useDashboard();
  const { quarterlyGoals } = useWeek();

  // Add keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-lg font-semibold">
              Focus Mode - Today's Goals
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>

          <div className="space-y-8">
            <div>
              <WeekCardDailyGoals
                weekNumber={weekNumber}
                showOnlyToday={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WeekCardWeeklyGoals = forwardRef<
  WeekCardWeeklyGoalsRef,
  WeekCardWeeklyGoalsProps
>(({ weekNumber }, ref) => {
  const { createWeeklyGoal, updateQuarterlyGoalTitle, deleteQuarterlyGoal } =
    useDashboard();
  const { quarterlyGoals } = useWeek();
  const [isFocusMode, setIsFocusMode] = useState(false);

  useImperativeHandle(ref, () => ({
    openFocusMode: () => setIsFocusMode(true),
  }));

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

  const handleCreateWeeklyGoal = async (
    quarterlyGoalId: Id<'goals'>,
    title: string
  ) => {
    if (!title.trim()) return;

    try {
      await createWeeklyGoal({
        title: title.trim(),
        parentId: quarterlyGoalId,
        weekNumber,
      });
    } catch (error) {
      console.error('Failed to create weekly goal:', error);
    }
  };

  const handleUpdateWeeklyGoalTitle = async (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => {
    try {
      await updateQuarterlyGoalTitle({
        goalId,
        title,
        details,
      });
    } catch (error) {
      console.error('Failed to update weekly goal title:', error);
      throw error;
    }
  };

  const handleDeleteWeeklyGoal = async (goalId: Id<'goals'>) => {
    try {
      await deleteQuarterlyGoal({
        goalId,
      });
    } catch (error) {
      console.error('Failed to delete weekly goal:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      {importantQuarterlyGoals.length === 0 ? (
        <div className="text-sm text-muted-foreground italic px-3">
          No starred or pinned quarterly goals
        </div>
      ) : (
        <div className="space-y-2">
          <Dialog open={isFocusMode} onOpenChange={setIsFocusMode}>
            <DialogPortal>
              <WeeklyGoalsFocusMode
                weekNumber={weekNumber}
                onClose={() => setIsFocusMode(false)}
              />
            </DialogPortal>
          </Dialog>

          {importantQuarterlyGoals.map((goal) => {
            const weeklyGoals = goal.children;
            const isStarred = goal.state?.isStarred ?? false;
            const isPinned = goal.state?.isPinned ?? false;

            return (
              <div key={goal._id} className="px-3 space-y-2">
                <div
                  className={cn(
                    'font-semibold text-sm text-gray-800 px-2 py-1 rounded-md',
                    isStarred && 'bg-yellow-50',
                    isPinned && 'bg-blue-50'
                  )}
                >
                  {goal.title}
                </div>
                <WeeklyGoalGroup
                  quarterlyGoal={goal}
                  weeklyGoals={weeklyGoals}
                  onCreateGoal={(title) =>
                    handleCreateWeeklyGoal(goal._id, title)
                  }
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
