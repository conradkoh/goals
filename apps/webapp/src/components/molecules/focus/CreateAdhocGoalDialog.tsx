import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { Flame, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

import { DomainSelector } from '@/components/atoms/DomainSelector';
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
import { Switch } from '@/components/ui/switch';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useDomains } from '@/hooks/useDomains';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the CreateAdhocGoalDialog component.
 *
 * @public
 *
 * @example
 * ```typescript
 * <CreateAdhocGoalDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   year={2024}
 *   weekNumber={48}
 * />
 * ```
 */
export interface CreateAdhocGoalDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback fired when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** ISO week year for the goal */
  year: number;
  /** ISO week number for the goal */
  weekNumber: number;
}

/**
 * Dialog for creating a new adhoc goal with domain and fire status options.
 * Supports quick entry with Cmd/Ctrl + Enter.
 *
 * @public
 *
 * @param props - Component props
 * @returns Rendered dialog component
 */
export function CreateAdhocGoalDialog({
  open,
  onOpenChange,
  year,
  weekNumber,
}: CreateAdhocGoalDialogProps) {
  const { sessionId } = useSession();
  const { createAdhocGoal } = useAdhocGoals(sessionId);
  const { domains, createDomain, updateDomain, deleteDomain } = useDomains(sessionId);
  const toggleFireStatus = useMutation(api.fireGoal.toggleFireStatus);

  const [title, setTitle] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState<Id<'domains'> | null>(null);
  const [isFireGoal, setIsFireGoal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handles the creation of a new domain within the dialog.
   * @internal
   */
  const handleDomainCreate = useCallback(
    async (name: string, description?: string, color?: string) => {
      try {
        const newDomainId = await createDomain(name, description, color);
        setSelectedDomainId(newDomainId);
        return newDomainId;
      } catch (error) {
        console.error('Failed to create domain:', error);
        throw error;
      }
    },
    [createDomain]
  );

  /**
   * Handles form submission to create the adhoc goal and optionally toggle fire status.
   * @internal
   */
  const handleSubmit = useCallback(async () => {
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const goalId = await createAdhocGoal(
        title.trim(),
        undefined, // details
        selectedDomainId || undefined,
        year,
        weekNumber
      );

      if (isFireGoal) {
        await toggleFireStatus({ sessionId, goalId });
      }

      onOpenChange(false);
      setTitle('');
      setSelectedDomainId(null);
      setIsFireGoal(false);
    } catch (error) {
      console.error('Failed to create adhoc goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    title,
    isSubmitting,
    createAdhocGoal,
    selectedDomainId,
    year,
    weekNumber,
    isFireGoal,
    toggleFireStatus,
    sessionId,
    onOpenChange,
  ]);

  /**
   * Handles the selection of a domain from the selector.
   * @internal
   */
  const handleDomainChange = useCallback((value: string | null) => {
    setSelectedDomainId(value as Id<'domains'> | null);
  }, []);

  /**
   * Handles domain update events.
   * @internal
   */
  const handleDomainUpdate = useCallback(
    async (domainId: Id<'domains'>, name: string, description?: string, color?: string) => {
      await updateDomain(domainId, { name, description, color });
    },
    [updateDomain]
  );

  /**
   * Handles domain deletion events.
   * @internal
   */
  const handleDomainDelete = useCallback(
    async (domainId: Id<'domains'>) => {
      await deleteDomain(domainId);
    },
    [deleteDomain]
  );

  /**
   * Handles keyboard events for quick submission.
   * @internal
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  /**
   * Handles title input changes.
   * @internal
   */
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  /**
   * Handles the close button click.
   * @internal
   */
  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            New Adhoc Goal
          </DialogTitle>
          <DialogDescription>
            Add a quick task for week {weekNumber}, {year}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="goal-title">Goal Text</Label>
            <Input
              id="goal-title"
              placeholder="What do you want to achieve?"
              value={title}
              onChange={handleTitleChange}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label>Domain</Label>
            <DomainSelector
              domains={domains}
              selectedDomainId={selectedDomainId}
              onDomainChange={handleDomainChange}
              onDomainCreate={handleDomainCreate}
              onDomainUpdate={handleDomainUpdate}
              onDomainDelete={handleDomainDelete}
              placeholder="Select domain (optional)"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Fire Goal
              </Label>
              <p className="text-[0.8rem] text-muted-foreground">
                Mark as high priority for today.
              </p>
            </div>
            <Switch checked={isFireGoal} onCheckedChange={setIsFireGoal} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
