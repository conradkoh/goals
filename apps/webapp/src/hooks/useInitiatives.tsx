import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import type { SessionId } from 'convex-helpers/server/sessions';
import { useState } from 'react';

export function useInitiatives(sessionId: SessionId) {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const initiatives = useQuery(api.initiative.getInitiatives, { sessionId }) ?? [];

  const createInitiativeMutation = useMutation(api.initiative.createInitiative);
  const updateInitiativeMutation = useMutation(api.initiative.updateInitiative);
  const deleteInitiativeMutation = useMutation(api.initiative.deleteInitiative);

  const createInitiative = async (args: {
    title: string;
    description?: string;
    startDate: number;
    endDate: number;
  }): Promise<Id<'initiatives'>> => {
    setIsCreating(true);
    try {
      return await createInitiativeMutation({ sessionId, ...args });
    } finally {
      setIsCreating(false);
    }
  };

  const updateInitiative = async (
    initiativeId: Id<'initiatives'>,
    updates: {
      title?: string;
      description?: string;
      startDate?: number;
      endDate?: number;
    }
  ): Promise<void> => {
    setIsUpdating(true);
    try {
      await updateInitiativeMutation({ sessionId, initiativeId, ...updates });
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteInitiative = async (initiativeId: Id<'initiatives'>): Promise<void> => {
    setIsDeleting(true);
    try {
      await deleteInitiativeMutation({ sessionId, initiativeId });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    initiatives,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    isCreating,
    isUpdating,
    isDeleting,
  };
}
