'use client';
// fallow-ignore-file code-duplication

import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import { ConvexError } from 'convex/values';
import { ContactRound, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

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
import {
  contactToFormValues,
  EMPTY_CONTACT_FORM,
  normalizeContactForm,
  normalizeContactFormForUpdate,
  type ContactInput,
  type UpdateContactInput,
} from '@/lib/contact/contact-form';

// fallow-ignore-next-line complexity
function getContactErrorDetails(error: unknown): { code?: string; message?: string } {
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

export interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Doc<'contacts'> | null;
  onCreate: (input: ContactInput) => Promise<void>;
  onUpdate: (contactId: Id<'contacts'>, input: UpdateContactInput) => Promise<void>;
  onDelete: (contactId: Id<'contacts'>) => Promise<void>;
  isSubmitting?: boolean;
  isDeleting?: boolean;
}

// fallow-ignore-next-line complexity
export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onCreate,
  onUpdate,
  onDelete,
  isSubmitting = false,
  isDeleting = false,
}: ContactFormDialogProps) {
  const isEditMode = Boolean(contact);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [notes, setNotes] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      setName(EMPTY_CONTACT_FORM.name);
      setEmail(EMPTY_CONTACT_FORM.email);
      setOrganization(EMPTY_CONTACT_FORM.organization);
      setNotes(EMPTY_CONTACT_FORM.notes);
      setShowDeleteConfirm(false);
      return;
    }

    if (contact) {
      const values = contactToFormValues(contact);
      setName(values.name);
      setEmail(values.email);
      setOrganization(values.organization);
      setNotes(values.notes);
    } else {
      setName(EMPTY_CONTACT_FORM.name);
      setEmail(EMPTY_CONTACT_FORM.email);
      setOrganization(EMPTY_CONTACT_FORM.organization);
      setNotes(EMPTY_CONTACT_FORM.notes);
    }
  }, [open, contact]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setShowDeleteConfirm(false);
    }
    onOpenChange(nextOpen);
  };

  const isBusy = isSubmitting || isDeleting;
  const isSubmitDisabled = !name.trim() || isBusy;

  // fallow-ignore-next-line complexity
  const handleSubmit = useCallback(async () => {
    if (isBusy) return;

    const values = { name, email, organization, notes };

    try {
      if (isEditMode && contact) {
        const normalized = normalizeContactFormForUpdate(values);
        if (!normalized) return;
        await onUpdate(contact._id, normalized);
      } else {
        const normalized = normalizeContactForm(values);
        if (!normalized) return;
        await onCreate(normalized);
      }
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save contact:', error);
      toast({
        variant: 'destructive',
        title: 'Could not save contact',
        description: getContactErrorDetails(error).message ?? 'Please try again.',
      });
    }
  }, [
    contact,
    email,
    isBusy,
    isEditMode,
    name,
    notes,
    onCreate,
    onOpenChange,
    onUpdate,
    organization,
  ]);

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
    if (!contact) return;

    try {
      await onDelete(contact._id);
      setShowDeleteConfirm(false);
      handleOpenChange(false);
    } catch (error) {
      console.error('Failed to delete contact:', error);
      const { code, message } = getContactErrorDetails(error);

      toast({
        variant: 'destructive',
        title: code === 'RESOURCE_IN_USE' ? 'Contact in use' : 'Could not delete contact',
        description: message ?? 'Please try again.',
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ContactRound className="h-5 w-5 text-primary" />
              {isEditMode ? 'Edit Contact' : 'New Contact'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update this contact’s details.'
                : 'Add someone connected to your goals and progress.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} onKeyDown={handleFormShortcut}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  placeholder="Who is this contact?"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-email">Email (optional)</Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-organization">Organization (optional)</Label>
                <Input
                  id="contact-organization"
                  placeholder="Company or team"
                  value={organization}
                  onChange={(event) => setOrganization(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-notes">Notes (optional)</Label>
                <Textarea
                  id="contact-notes"
                  placeholder="How you know them or context to remember..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  onKeyDown={handleFormShortcut}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              {isEditMode ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isBusy}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
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
                  disabled={isBusy}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitDisabled}>
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Contact'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{contact?.name}&rdquo;. Remove this contact from
              linked goals and logs before deleting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteConfirm();
              }}
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
