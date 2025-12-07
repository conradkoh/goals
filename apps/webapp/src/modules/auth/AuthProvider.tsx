'use client';
import { api } from '@workspace/backend/convex/_generated/api';
import type { AuthState } from '@workspace/backend/modules/auth/types/AuthState';
import { useMutation } from 'convex/react';
import { SessionProvider, type UseStorage, useSessionQuery } from 'convex-helpers/react/sessions';
import type { SessionId } from 'convex-helpers/server/sessions';
import { createContext, useContext, useEffect, useState } from 'react';
import { generateUUID } from '@/lib/utils';

const AuthContext = createContext<AuthState | undefined>(undefined);

// Constants for localStorage keys
const OLD_SESSION_KEY = 'goals-session-id';
const NEW_SESSION_KEY = 'sessionId';

/**
 * Provides authentication context to the application with session management.
 */
export const AuthProvider = _withSessionProvider(({ children }: { children: React.ReactNode }) => {
  // Get the backend validation of what the auth state is
  const authState = useSessionQuery(api.auth.getState);
  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
});

/**
 * Hook to access the current authentication state.
 */
export const useAuthState = () => {
  const authState = useContext(AuthContext);
  return authState;
};

/**
 * Hook to access the current authenticated user, returning undefined if not authenticated.
 */
export const useCurrentUser = () => {
  const authState = useAuthState();
  return authState?.state === 'authenticated' ? authState.user : undefined;
};

/**
 * Higher-order component that wraps components with session provider functionality.
 */
function _withSessionProvider(Component: React.ComponentType<{ children: React.ReactNode }>) {
  return (props: { children: React.ReactNode }) => {
    return (
      <SessionProvider
        storageKey={NEW_SESSION_KEY}
        useStorage={_useLocalStorage}
        idGenerator={generateUUID}
      >
        <_SessionMigrationWrapper>
          <Component {...props} />
        </_SessionMigrationWrapper>
      </SessionProvider>
    );
  };
}

/**
 * Component that handles migration of old session IDs to new format.
 * Checks for old goals-session-id and exchanges it for a new sessionId.
 */
function _SessionMigrationWrapper({ children }: { children: React.ReactNode }) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationChecked, setMigrationChecked] = useState(false);
  const exchangeSession = useMutation(api.auth.exchangeSession);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    // Check if we've already done the migration check
    if (migrationChecked) return;

    const oldSessionId = localStorage.getItem(OLD_SESSION_KEY);
    const newSessionId = localStorage.getItem(NEW_SESSION_KEY);

    // If there's no old session ID, nothing to migrate
    if (!oldSessionId) {
      setMigrationChecked(true);
      return;
    }

    // If both exist, use the old one and update the new one (don't delete old)
    // This allows master branch to keep using goals-session-id
    if (newSessionId) {
      setIsMigrating(true);

      exchangeSession({ oldSessionId, newSessionId })
        .then((result) => {
          if (result.success && result.sessionId) {
            // Update the new session ID with the exchanged value
            localStorage.setItem(NEW_SESSION_KEY, result.sessionId);
            // Keep the old session ID for master branch compatibility
            // Reload to pick up the updated session
            window.location.reload();
          } else {
            // Migration failed, just mark as checked and continue
            console.warn('Session migration failed:', result.reason);
            setMigrationChecked(true);
            setIsMigrating(false);
          }
        })
        .catch((error) => {
          console.error('Session migration error:', error);
          setMigrationChecked(true);
          setIsMigrating(false);
        });

      return;
    }

    // Only old session exists: exchange and create new one
    setIsMigrating(true);

    const newId = generateUUID();

    exchangeSession({ oldSessionId, newSessionId: newId })
      .then((result) => {
        if (result.success && result.sessionId) {
          // Store the new session ID
          localStorage.setItem(NEW_SESSION_KEY, result.sessionId);
          // Keep the old session ID for master branch compatibility
          // Reload to pick up the new session
          window.location.reload();
        } else {
          // Migration failed, just clean up and let the app create a new session
          console.warn('Session migration failed:', result.reason);
          localStorage.removeItem(OLD_SESSION_KEY);
          setMigrationChecked(true);
          setIsMigrating(false);
        }
      })
      .catch((error) => {
        console.error('Session migration error:', error);
        // Clean up and let the app continue
        localStorage.removeItem(OLD_SESSION_KEY);
        setMigrationChecked(true);
        setIsMigrating(false);
      });
  }, [exchangeSession, migrationChecked]);

  // Show loading state while migrating
  if (isMigrating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Migrating session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Custom local storage hook for session management that handles client-side hydration.
 */
const _useLocalStorage = (
  key: string,
  nextSessionId: SessionId | undefined
): ReturnType<UseStorage<SessionId | undefined>> => {
  const [sessionId, setSessionId] = useState<SessionId>('' as string & { __SessionId: true });

  useEffect(() => {
    // Run only on the client
    const prevSessionId = localStorage.getItem(key) as SessionId | null;
    if (prevSessionId == null) {
      if (nextSessionId) {
        // No last session, create a new one and mark it has started
        localStorage.setItem(key, nextSessionId);
        setSessionId(nextSessionId); // If local storage has value, use it instead of the one passed in
      } else {
        // There is no next session id, do nothing
      }
    } else {
      setSessionId(prevSessionId); // Load the previous session
    }
  }, [key, nextSessionId]);

  const set = (_val: SessionId | undefined) => {
    // Do nothing - this doesn't seem to be called
  };

  return [
    sessionId, // The value returned here will be used as the source of truth
    (v: SessionId | undefined) => {
      set(v);
    },
  ] satisfies [SessionId | null, (value: SessionId) => void];
};
