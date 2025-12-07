import type { Id } from '@services/backend/convex/_generated/dataModel';
import { CalendarIcon, Edit2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DomainSelector } from '@/components/atoms/DomainSelector';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { toast } from '@/components/ui/use-toast';
import { useDeviceScreenInfo } from '@/hooks/useDeviceScreenInfo';
import { useDomains } from '@/hooks/useDomains';
import { useFormSubmitShortcut } from '@/hooks/useFormSubmitShortcut';
import { cn } from '@/lib/utils';
import type { GoalUpdatePendingHandler } from '@/models/goal-handlers';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the GoalEditPopover component.
 */
export interface GoalEditPopoverProps {
  /** Current title of the goal */
  title: string;
  /** Current details/description of the goal */
  details?: string;
  /** Callback fired when the goal is saved */
  onSave: (
    title: string,
    details: string,
    dueDate?: number,
    domainId?: Id<'domains'> | null
  ) => Promise<void>;
  /** Custom trigger element (defaults to edit icon button) */
  trigger?: React.ReactNode;
  /** Initial due date as Unix timestamp */
  initialDueDate?: number;
  /** Initial domain ID for adhoc goals */
  initialDomainId?: Id<'domains'> | null;
  /** Whether to show the domain selector (for adhoc goals) */
  showDomainSelector?: boolean;
  /** Called with the update promise for tracking pending state in the parent */
  onUpdatePending?: GoalUpdatePendingHandler;
}

/**
 * Popover component for editing goal title, details, due date, and domain.
 * Supports both popover mode (desktop) and fullscreen dialog mode (touch devices).
 *
 * Features optimistic UI - closes immediately on save while the update is in flight.
 * Use `onUpdatePending` to track the save promise and show loading indicators.
 *
 * @example
 * ```tsx
 * <GoalEditPopover
 *   title={goal.title}
 *   details={goal.details}
 *   initialDueDate={goal.dueDate}
 *   onSave={handleSave}
 *   onUpdatePending={setPendingUpdate}
 * />
 * ```
 */
export function GoalEditPopover({
  title: initialTitle,
  details: initialDetails,
  onSave,
  trigger,
  initialDueDate,
  initialDomainId,
  showDomainSelector = false,
  onUpdatePending,
}: GoalEditPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [details, setDetails] = useState(initialDetails ?? '');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialDueDate ? new Date(initialDueDate) : undefined
  );
  const [domainId, setDomainId] = useState<Id<'domains'> | null | undefined>(initialDomainId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sessionId } = useSession();
  const { domains, createDomain, updateDomain, deleteDomain } = useDomains(sessionId);
  const { isHydrated, preferFullscreenDialogs } = useDeviceScreenInfo();

  // Sync title with external data when it changes or popover opens
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
    }
  }, [isOpen, initialTitle]);

  // Sync details with external data when it changes or popover opens
  useEffect(() => {
    if (isOpen) {
      setDetails(initialDetails ?? '');
    }
  }, [isOpen, initialDetails]);

  // Sync due date when popover opens
  useEffect(() => {
    if (isOpen) {
      setDueDate(initialDueDate ? new Date(initialDueDate) : undefined);
    }
  }, [isOpen, initialDueDate]);

  // Sync domain when popover opens
  useEffect(() => {
    if (isOpen) {
      setDomainId(initialDomainId);
    }
  }, [isOpen, initialDomainId]);

  /**
   * Resets form state and closes the popover.
   */
  const handleCancel = useCallback(() => {
    setTitle(initialTitle);
    setDetails(initialDetails ?? '');
    setDueDate(initialDueDate ? new Date(initialDueDate) : undefined);
    setDomainId(initialDomainId);
    setIsOpen(false);
  }, [initialTitle, initialDetails, initialDueDate, initialDomainId]);

  /**
   * Saves the goal with optimistic UI - closes immediately while save is in flight.
   */
  const handleSave = useCallback(async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    // Optimistically close the dialog immediately
    setIsOpen(false);

    // Create the save promise
    const savePromise = onSave(title.trim(), details, dueDate?.getTime(), domainId);

    // Notify parent of pending update (allows showing loading indicator in list item)
    onUpdatePending?.(savePromise);

    try {
      await savePromise;
    } catch (error) {
      console.error('Failed to save goal:', error);
      toast({
        title: 'Failed to save goal',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [title, details, dueDate, domainId, onSave, onUpdatePending]);

  /**
   * Handles Enter key press to submit the form.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  const handleFormShortcut = useFormSubmitShortcut({
    onSubmit: handleSave,
  });

  /**
   * Handles popover/dialog open state changes.
   */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleCancel();
      } else {
        setIsOpen(true);
      }
    },
    [handleCancel]
  );

  const defaultTrigger = useMemo(
    () => (
      <Button variant="ghost" size="icon" className="h-6 w-6">
        <Edit2 className="h-4 w-4" />
      </Button>
    ),
    []
  );

  // Shared form content for both popover and dialog modes
  const formContent = (
    // biome-ignore lint/a11y/noStaticElementInteractions: Form keyboard shortcuts handled at container level
    <div className="space-y-4" onKeyDown={handleFormShortcut}>
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium text-muted-foreground">
          Title
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-sm"
          placeholder="Enter title..."
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="details" className="text-sm font-medium text-muted-foreground">
          Details
        </label>
        <RichTextEditor
          value={details}
          onChange={setDetails}
          placeholder="Add details..."
          className="min-h-[150px] p-3 rounded-md border"
        />
      </div>
      <div className="space-y-2">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with date picker below */}
        <label className="text-sm font-medium text-muted-foreground">Due Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !dueDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? DateTime.fromJSDate(dueDate).toFormat('LLL dd, yyyy') : 'Set due date...'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
            {dueDate && (
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setDueDate(undefined)}
                >
                  Clear due date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      {showDomainSelector && (
        <div className="space-y-2">
          {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with DomainSelector below */}
          <label className="text-sm font-medium text-muted-foreground">Domain</label>
          <DomainSelector
            domains={domains}
            selectedDomainId={domainId === null ? null : domainId}
            onDomainChange={(newDomainId) => setDomainId(newDomainId as Id<'domains'> | null)}
            onDomainCreate={async (name, description, color) => {
              const newDomainId = await createDomain(name, description, color);
              setDomainId(newDomainId);
              return newDomainId;
            }}
            onDomainUpdate={async (domainIdToUpdate, name, description, color) => {
              await updateDomain(domainIdToUpdate, { name, description, color });
            }}
            onDomainDelete={deleteDomain}
            allowCreate={true}
            allowEdit={true}
            placeholder="Select a domain..."
            className="w-full"
          />
        </div>
      )}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSubmitting || !title.trim()}>
          Save
        </Button>
      </div>
    </div>
  );

  // Use fullscreen dialog on touch devices
  if (isHydrated && preferFullscreenDialogs) {
    return (
      <>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: The trigger itself handles keyboard events */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: The trigger contains interactive elements */}
        <span className="contents" onClick={() => setIsOpen(true)}>
          {trigger || defaultTrigger}
        </span>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogContent
            fullscreenSafe
            className={cn(
              // Width: full width minus small margin
              'w-[calc(100vw-16px)] max-w-none',
              // Height: use dvh for iOS Safari dynamic viewport
              'h-[calc(100dvh-32px)] max-h-none',
              // Safe area padding for notch and home indicator
              'pb-[env(safe-area-inset-bottom,0px)]',
              'overflow-hidden flex flex-col p-4'
            )}
          >
            <DialogHeader className="pb-2 border-b mb-4">
              <DialogTitle className="text-lg font-semibold">Edit Goal</DialogTitle>
            </DialogHeader>
            {/* Scrollable content with keyboard-friendly padding */}
            <div className="flex-1 overflow-y-auto overscroll-contain pb-4 pr-4">{formContent}</div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>
      <PopoverContent className="w-[400px] max-w-[calc(100vw-32px)] p-4">
        {formContent}
      </PopoverContent>
    </Popover>
  );
}
