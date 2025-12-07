'use client';
import { useContext } from 'react';
import { SessionContext } from '@/modules/auth/SessionContext';

export function useSession() {
  const { sessionId } = useContext(SessionContext);
  if (!sessionId) {
    throw new Error('Session ID used before initialization');
  }
  return { sessionId };
}
