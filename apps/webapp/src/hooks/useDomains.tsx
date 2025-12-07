import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import type { SessionId } from 'convex-helpers/server/sessions';
import { useState } from 'react';

export function useDomains(sessionId: SessionId) {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const domains = useQuery(api.domain.getDomains, { sessionId }) || [];

  const createDomainMutation = useMutation(api.domain.createDomain);
  const updateDomainMutation = useMutation(api.domain.updateDomain);
  const deleteDomainMutation = useMutation(api.domain.deleteDomain);

  const createDomain = async (
    name: string,
    description?: string,
    color?: string
  ): Promise<Id<'domains'>> => {
    setIsCreating(true);
    try {
      const domainId = await createDomainMutation({
        sessionId,
        name,
        description,
        color,
      });
      return domainId;
    } finally {
      setIsCreating(false);
    }
  };

  const updateDomain = async (
    domainId: Id<'domains'>,
    updates: {
      name?: string;
      description?: string;
      color?: string;
    }
  ): Promise<void> => {
    setIsUpdating(true);
    try {
      await updateDomainMutation({
        sessionId,
        domainId,
        ...updates,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteDomain = async (domainId: Id<'domains'>): Promise<void> => {
    setIsDeleting(true);
    try {
      await deleteDomainMutation({
        sessionId,
        domainId,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    domains,
    createDomain,
    updateDomain,
    deleteDomain,
    isCreating,
    isUpdating,
    isDeleting,
  };
}

export function useDomain(sessionId: SessionId, domainId: Id<'domains'>) {
  const domain = useQuery(api.domain.getDomain, { sessionId, domainId });

  return {
    domain,
    isLoading: domain === undefined,
  };
}
