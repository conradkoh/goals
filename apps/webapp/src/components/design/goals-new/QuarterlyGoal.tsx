import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Edit2, Trash2 } from 'lucide-react';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { SafeHTML, sanitizeHTML } from '@/components/ui/safe-html';
import { GoalStarPin } from './GoalStarPin';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { DeleteGoalIconButton } from './DeleteGoalIconButton';
import { GoalEditPopover } from './GoalEditPopover';

interface QuarterlyGoalProps {
  goal: GoalWithDetailsAndChildren;
  weekNumber: number;
  onToggleStatus: (
    goalId: Id<'goals'>,
    isStarred: boolean,
    isPinned: boolean
  ) => Promise<void>;
  onUpdateTitle: (
    goalId: Id<'goals'>,
    title: string,
    details?: string
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
}

export function QuarterlyGoal({
  goal,
  weekNumber,
  onToggleStatus,
  onUpdateTitle,
  onDelete,
}: QuarterlyGoalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const [details, setDetails] = useState(goal.details || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      // Sanitize the HTML before saving
      const sanitizedDetails = sanitizeHTML(details);
      await onUpdateTitle(
        goal._id as Id<'goals'>,
        title.trim(),
        sanitizedDetails
      );
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update goal:', error);
      // TODO: Add proper error handling UI
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(goal._id as Id<'goals'>);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete goal:', error);
      // TODO: Add proper error handling UI
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle Enter in title input
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
      // Handle Cmd/Ctrl + Enter anywhere in the form
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  const handleToggleStar = useCallback(() => {
    onToggleStatus(
      goal._id as Id<'goals'>,
      !goal.state?.isStarred,
      goal.state?.isPinned || false
    );
  }, [goal._id, goal.state?.isStarred, goal.state?.isPinned, onToggleStatus]);

  const handleTogglePin = useCallback(() => {
    onToggleStatus(
      goal._id as Id<'goals'>,
      goal.state?.isStarred || false,
      !goal.state?.isPinned
    );
  }, [goal._id, goal.state?.isStarred, goal.state?.isPinned, onToggleStatus]);

  return (
    <>
      <div className="group px-2 py-1 hover:bg-gray-50 rounded-sm">
        <div className="flex items-center gap-2 group/title">
          <GoalStarPin
            value={{
              isStarred: goal.state?.isStarred || false,
              isPinned: goal.state?.isPinned || false,
            }}
            onStarred={handleToggleStar}
            onPinned={handleTogglePin}
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
                    details={goal.details || ''}
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

          {/* Edit Mode */}
          <GoalEditPopover
            title={goal.title}
            details={goal.details || ''}
            onSave={async (title, details) => {
              await onUpdateTitle(goal._id, title, details);
            }}
            trigger={
              <button className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-foreground">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            }
          />

          {/* Delete Button */}
          <DeleteGoalIconButton
            onDelete={() => onDelete(goal._id as Id<'goals'>)}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this goal? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
