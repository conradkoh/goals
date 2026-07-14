import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import type { SessionId } from 'convex-helpers/server/sessions';
import { useState } from 'react';

import type { ContactInput, UpdateContactInput } from '@/lib/contact/contact-form';

export function useContacts(sessionId: SessionId, search = '') {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const trimmedSearch = search.trim();
  const contacts = useQuery(api.contact.getContacts, {
    sessionId,
    ...(trimmedSearch ? { search: trimmedSearch } : {}),
  });

  const createContactMutation = useMutation(api.contact.createContact);
  const updateContactMutation = useMutation(api.contact.updateContact);
  const deleteContactMutation = useMutation(api.contact.deleteContact);

  const createContact = async (input: ContactInput): Promise<Id<'contacts'>> => {
    setIsCreating(true);
    try {
      return await createContactMutation({ sessionId, ...input });
    } finally {
      setIsCreating(false);
    }
  };

  const updateContact = async (
    contactId: Id<'contacts'>,
    input: UpdateContactInput
  ): Promise<void> => {
    setIsUpdating(true);
    try {
      await updateContactMutation({ sessionId, contactId, ...input });
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteContact = async (contactId: Id<'contacts'>): Promise<void> => {
    setIsDeleting(true);
    try {
      await deleteContactMutation({ sessionId, contactId });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    contacts,
    isLoading: contacts === undefined,
    createContact,
    updateContact,
    deleteContact,
    isCreating,
    isUpdating,
    isDeleting,
  };
}
