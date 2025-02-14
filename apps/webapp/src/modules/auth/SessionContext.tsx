'use client';
import { ConditionalRender } from '@/components/util/ConditionalRender';
import { api } from '@services/backend/convex/_generated/api';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { createContext, useState, useEffect } from 'react';

const SESSION_ID_KEY = 'goals-session-id';

export const SessionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const enforceSession = useMutation(api.auth.useAnonymousSession);
  const [sessionId, setSessionId] = useState<Id<'sessions'> | null>(
    localStorage.getItem(SESSION_ID_KEY) as Id<'sessions'> | null
  );
  console.log('sessionId', sessionId);
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
