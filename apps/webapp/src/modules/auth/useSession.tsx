'use client';
import { SessionContext } from '@/modules/auth/SessionContext';
import { useContext } from 'react';

export function useSession() {
  const { sessionId } = useContext(SessionContext);
  if (!sessionId) {
    throw new Error('Session ID used before initialization');
  }
  return { sessionId };
}
