'use client';

import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { ContactRound, Loader2, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { ContactCard } from '@/components/molecules/contacts/ContactCard';
import { ContactFormDialog } from '@/components/molecules/contacts/ContactFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContacts } from '@/hooks/useContacts';
import { useSession } from '@/modules/auth/useSession';

// fallow-ignore-next-line complexity
export default function ContactsPage() {
  const { sessionId } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Doc<'contacts'> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    contacts,
    isLoading,
    createContact,
    updateContact,
    deleteContact,
    isCreating,
    isUpdating,
    isDeleting,
  } = useContacts(sessionId, searchQuery);

  const handleNewContact = useCallback(() => {
    setSelectedContact(null);
    setDialogOpen(true);
  }, []);

  const handleSelectContact = useCallback((contact: Doc<'contacts'>) => {
    setSelectedContact(contact);
    setDialogOpen(true);
  }, []);

  const handleCreate = useCallback(
    async (input: Parameters<typeof createContact>[0]) => {
      await createContact(input);
      toast.success('Contact created');
    },
    [createContact]
  );

  const handleUpdate = useCallback(
    async (...args: Parameters<typeof updateContact>) => {
      await updateContact(...args);
      toast.success('Contact updated');
    },
    [updateContact]
  );

  const handleDelete = useCallback(
    async (contactId: Parameters<typeof deleteContact>[0]) => {
      await deleteContact(contactId);
      toast.success('Contact deleted');
    },
    [deleteContact]
  );

  const isFiltered = searchQuery.trim().length > 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ContactRound className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Contacts</h1>
        </div>
        <Button onClick={handleNewContact}>
          <Plus className="mr-2 h-4 w-4" />
          New Contact
        </Button>
      </div>

      <p className="mb-6 text-muted-foreground">
        Keep track of the people connected to your goals and progress.
      </p>

      <div className="mb-6">
        <Input
          type="search"
          placeholder="Search contacts by name, email, or organization..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !contacts || contacts.length === 0 ? (
        <div className="py-12 text-center">
          <ContactRound className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-medium">
            {isFiltered ? 'No contacts found' : 'No contacts yet'}
          </h2>
          <p className="mb-4 text-muted-foreground">
            {isFiltered
              ? 'Try a different search term.'
              : 'Create your first contact to start tracking the people connected to your work.'}
          </p>
          {!isFiltered && (
            <Button onClick={handleNewContact}>
              <Plus className="mr-2 h-4 w-4" />
              Create Contact
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {contacts.map((contact) => (
            <ContactCard key={contact._id} contact={contact} onSelect={handleSelectContact} />
          ))}
        </div>
      )}

      <ContactFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={selectedContact}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        isSubmitting={isCreating || isUpdating}
        isDeleting={isDeleting}
      />
    </div>
  );
}
