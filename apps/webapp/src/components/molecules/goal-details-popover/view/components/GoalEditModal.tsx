import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { CalendarIcon } from 'lucide-react';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';

import { DomainSelector } from '@/components/atoms/DomainSelector';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { toast } from '@/components/ui/use-toast';
import { useDomains } from '@/hooks/useDomains';
import { useFormSubmitShortcut } from '@/hooks/useFormSubmitShortcut';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

export interface GoalEditModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** The goal being edited */
  goal: GoalWithDetailsAndChildren | null;
  /** Callback when save is triggered */
  onSave: (
    title: string,
    details: string | undefined,
    dueDate: number | undefined,
    domainId?: Id<'domains'> | null
  ) => Promise<void>;
  /** Callback when modal is closed */
  onClose: () => void;
}

/**
 * Shared modal component for editing goal details.
 * Extracted to be reusable across GoalDetailsPopover and GoalDetailsFullScreenModal.
 *
 * Features:
 * - Title editing
 * - Rich text details editing
 * - Due date picker
 * - Domain selector (for adhoc goals only)
 * - Cmd/Ctrl+Enter to save
 */
export function GoalEditModal({ isOpen, goal, onSave, onClose }: GoalEditModalProps) {
  const [editTitle, setEditTitle] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editDueDate, setEditDueDate] = useState<Date | undefined>(undefined);
  const [editDomainId, setEditDomainId] = useState<Id<'domains'> | null | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { sessionId } = useSession();
  const { domains, createDomain, updateDomain, deleteDomain } = useDomains(sessionId);

  const handleKeyDown = useFormSubmitShortcut({
    onSubmit: handleSave,
    shouldPreventDefault: true,
  });

  // Check if the goal is an adhoc goal (depth === -1)
  const isAdhocGoal = goal?.depth === -1;

  // Initialize form data when modal opens with a goal
  useEffect(() => {
    if (isOpen && goal && !hasInitialized) {
      setEditTitle(goal.title);
      setEditDetails(goal.details || '');
      setEditDueDate(goal.dueDate ? new Date(goal.dueDate) : undefined);
      setEditDomainId(goal.domainId || null);
      setHasInitialized(true);
    }
  }, [isOpen, goal, hasInitialized]);

  // Reset initialization flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
    }
  }, [isOpen]);

  async function handleSave() {
    if (!goal || isSubmitting) return;

    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      toast({
        title: 'Error',
        description: 'Goal title cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    const dueDateTimestamp = editDueDate?.getTime();

    setIsSubmitting(true);
    try {
      await onSave(trimmedTitle, editDetails, dueDateTimestamp, editDomainId);
      onClose();
      // Clear form state after successful save
      setEditTitle('');
      setEditDetails('');
      setEditDueDate(undefined);
      setEditDomainId(undefined);
      setHasInitialized(false);
    } catch (error) {
      console.error('[GoalEditModal] Failed to save goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to save goal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
        </DialogHeader>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: Keyboard handler needed for form submission */}
        <div className="space-y-6 py-4" onKeyDown={handleKeyDown}>
          <div className="space-y-2">
            {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with input below */}
            <label className="text-sm font-medium">Title</label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter goal title..."
              autoFocus
            />
          </div>
          <div className="space-y-2">
            {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with RichTextEditor below */}
            <label className="text-sm font-medium">Details</label>
            <RichTextEditor
              value={editDetails}
              onChange={setEditDetails}
              placeholder="Add goal details..."
            />
          </div>
          <div className="space-y-2">
            {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with date picker below */}
            <label className="text-sm font-medium">Due Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !editDueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editDueDate
                    ? DateTime.fromJSDate(editDueDate).toFormat('LLL dd, yyyy')
                    : 'Set due date...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={editDueDate}
                  onSelect={setEditDueDate}
                  initialFocus
                />
                {editDueDate && (
                  <div className="p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setEditDueDate(undefined)}
                    >
                      Clear due date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          {isAdhocGoal && (
            <div className="space-y-2">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is visually associated with DomainSelector below */}
              <label className="text-sm font-medium">Domain</label>
              <DomainSelector
                domains={domains}
                selectedDomainId={editDomainId === null ? null : editDomainId}
                onDomainChange={(domainId) => setEditDomainId(domainId as Id<'domains'> | null)}
                onDomainCreate={async (name, description, color) => {
                  const newDomainId = await createDomain(name, description, color);
                  setEditDomainId(newDomainId);
                  return newDomainId;
                }}
                onDomainUpdate={async (domainId, name, description, color) => {
                  await updateDomain(domainId, { name, description, color });
                }}
                onDomainDelete={deleteDomain}
                allowCreate={true}
                allowEdit={true}
                placeholder="Select a domain..."
                className="w-full"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
