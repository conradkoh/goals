'use client';
import { useSessionId } from 'convex-helpers/react/sessions';
import type { SessionId } from 'convex-helpers/server/sessions';

/**
 * Hook to get the current session ID for use with backend mutations/queries.
 *
 * Returns the sessionId as a SessionId type (branded string) that can be passed
 * to backend functions using the SessionIdArg pattern from convex-helpers.
 */
export function useSession(): { sessionId: SessionId } {
  const [sessionId] = useSessionId();

  if (!sessionId) {
    throw new Error('Session ID used before initialization');
  }

  return { sessionId };
}
