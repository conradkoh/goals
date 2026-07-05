'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { Flag, Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useState } from 'react';

import { DatePicker } from '@/components/DatePicker';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useFormSubmitShortcut } from '@/hooks/useFormSubmitShortcut';
import { normalizeInitiativeDates } from '@/lib/date/initiative-dates';
import { useSession } from '@/modules/auth/useSession';

// fallow-ignore-next-line complexity
function getInitiativeErrorDetails(error: unknown): { code?: string; message?: string } {
  if (error instanceof ConvexError) {
    const data = error.data;
    if (typeof data === 'object' && data !== null) {
      return {
        code: 'code' in data ? String(data.code) : undefined,
        message: 'message' in data && typeof data.message === 'string' ? data.message : undefined,
      };
    }
  }
  if (error instanceof Error) return { message: error.message };
  return {};
}

export interface InitiativeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initiative?: Doc<'initiatives'> | null;
  onCreate: (args: {
    title: string;
    description?: string;
    startDate: number;
    endDate?: number;
  }) => Promise<void>;
  onUpdate: (
    initiativeId: Id<'initiatives'>,
    args: { title: string; description?: string; startDate: number; endDate: number | null }
  ) => Promise<void>;
  onDelete?: (initiativeId: Id<'initiatives'>) => Promise<void>;
  isSubmitting?: boolean;
}

type InitiativeFormDates = {
  startDate: Date;
  endDate: Date | undefined;
};

function getDefaultDates(): InitiativeFormDates {
  const today = DateTime.now().startOf('day').toJSDate();
  return { startDate: today, endDate: undefined };
}

function initiativeToDates(initiative: Doc<'initiatives'>): InitiativeFormDates {
  return {
    startDate: DateTime.fromMillis(initiative.startDate).toJSDate(),
    endDate: initiative.endDate ? DateTime.fromMillis(initiative.endDate).toJSDate() : undefined,
  };
}

// fallow-ignore-next-line complexity
export function InitiativeFormDialog({
  open,
  onOpenChange,
  initiative,
  onCreate,
  onUpdate,
  onDelete,
  isSubmitting = false,
}: InitiativeFormDialogProps) {
  const { sessionId } = useSession();
  const isEditMode = Boolean(initiative);
  const goalCounts = useQuery(
    api.initiative.getInitiativeGoalCounts,
    isEditMode && initiative ? { sessionId } : 'skip'
  );
  const taggedGoalCount = initiative ? goalCounts?.[initiative._id]?.total : undefined;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>(getDefaultDates().startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      const defaults = getDefaultDates();
      setStartDate(defaults.startDate);
      setEndDate(defaults.endDate);
      setShowDeleteConfirm(false);
      return;
    }

    if (initiative) {
      setTitle(initiative.title);
      setDescription(initiative.description ?? '');
      const dates = initiativeToDates(initiative);
      setStartDate(dates.startDate);
      setEndDate(dates.endDate);
    } else {
      setTitle('');
      setDescription('');
      const defaults = getDefaultDates();
      setStartDate(defaults.startDate);
      setEndDate(defaults.endDate);
    }
  }, [open, initiative]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setShowDeleteConfirm(false);
    }
    onOpenChange(nextOpen);
  };

  // fallow-ignore-next-line complexity
  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting || isDeleting) return;

    const { startDate: normalizedStart, endDate: normalizedEnd } = normalizeInitiativeDates(
      startDate,
      endDate
    );

    try {
      if (isEditMode && initiative) {
        await onUpdate(initiative._id, {
          title: trimmedTitle,
          description: description.trim() || undefined,
          startDate: normalizedStart,
          endDate: endDate === undefined ? null : (normalizedEnd ?? null),
        });
      } else {
        const payload = {
          title: trimmedTitle,
          description: description.trim() || undefined,
          startDate: normalizedStart,
          ...(normalizedEnd !== undefined ? { endDate: normalizedEnd } : {}),
        };
        await onCreate(payload);
      }
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save initiative:', error);
      toast({
        variant: 'destructive',
        title: 'Could not save initiative',
        description: getInitiativeErrorDetails(error).message ?? 'Please try again.',
      });
    }
  }, [
    title,
    isSubmitting,
    isDeleting,
    startDate,
    endDate,
    isEditMode,
    initiative,
    onUpdate,
    onCreate,
    onOpenChange,
    description,
  ]);

  const isSubmitDisabled = !title.trim() || isSubmitting || isDeleting;

  const handleFormShortcut = useFormSubmitShortcut({
    onSubmit: () => void handleSubmit(),
    disabled: isSubmitDisabled,
  });

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void handleSubmit();
  };

  // fallow-ignore-next-line complexity
  const handleDeleteConfirm = async () => {
    if (!initiative || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(initiative._id);
      setShowDeleteConfirm(false);
      handleOpenChange(false);
    } catch (error) {
      console.error('Failed to delete initiative:', error);
      const { code, message } = getInitiativeErrorDetails(error);

      toast({
        variant: 'destructive',
        title: code === 'RESOURCE_IN_USE' ? 'Initiative in use' : 'Could not delete initiative',
        description: message ?? 'Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-primary" />
              {isEditMode ? 'Edit Initiative' : 'New Initiative'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? taggedGoalCount !== undefined
                  ? `Update this initiative. ${taggedGoalCount} goal${taggedGoalCount === 1 ? '' : 's'} tagged.`
                  : 'Update this initiative’s title, description, or dates.'
                : 'Group goals across quarters with a date-bounded initiative.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} onKeyDown={handleFormShortcut}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="initiative-title">Title</Label>
                <Input
                  id="initiative-title"
                  placeholder="What are you focusing on?"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="initiative-description">Description (optional)</Label>
                <Textarea
                  id="initiative-description"
                  placeholder="Add context for this initiative..."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  onKeyDown={handleFormShortcut}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label>Start date</Label>
                <DatePicker
                  value={startDate}
                  onChange={(date) => {
                    if (!date) return;
                    setStartDate(date);
                    if (endDate && endDate < date) setEndDate(undefined);
                  }}
                  allowFutureDates
                  placeholder="Select start date"
                />
              </div>
              <div className="grid gap-2">
                <Label>End date (optional)</Label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  allowFutureDates
                  clearable
                  minDate={startDate}
                  placeholder="No end date"
                />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
              {isEditMode && onDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting || isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2 sm:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting || isDeleting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitDisabled}>
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Initiative'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete initiative?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{initiative?.title}&rdquo;. Goals tagged to this
              initiative must be untagged first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              variant="destructive"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
