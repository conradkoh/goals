'use client';
import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { createContext, useEffect, useState } from 'react';

import { ConditionalRender } from '@/components/atoms/ConditionalRender';

const SESSION_ID_KEY = 'goals-session-id';

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const enforceSession = useMutation(api.auth.useAnonymousSession);
  const [sessionId, setSessionId] = useState<Id<'sessions'> | null>(
    localStorage.getItem(SESSION_ID_KEY) as Id<'sessions'> | null
  );
  useEffect(() => {
    (async () => {
      const nextSessionId = await enforceSession({
        sessionId: sessionId,
      });
      if (nextSessionId !== sessionId) {
        setSessionId(nextSessionId);
        localStorage.setItem(SESSION_ID_KEY, nextSessionId);
      }
    })();
  }, [enforceSession, sessionId]);
  return (
    <SessionContext.Provider value={{ sessionId }}>
      <ConditionalRender condition={!!sessionId}>{children}</ConditionalRender>
    </SessionContext.Provider>
  );
};
export const SessionContext = createContext<{
  sessionId: Id<'sessions'> | null;
}>({
  sessionId: null,
});
