'use client';

import { useCallback, useRef, useState } from 'react';

const STORAGE_PREFIX = 'cli-authorize-attempts:';

/** Parses a stored count, returning null for missing or malformed values. */
function parseCount(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Reads a stored failure count, tolerating SSR and storage-denied environments. */
function readStoredCount(key: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseCount(window.sessionStorage.getItem(key));
  } catch {
    return null;
  }
}

/** Writes a failure count; storage denial falls back to the in-memory counter only. */
function writeStoredCount(key: string, value: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, String(value));
  } catch {
    // Storage unavailable (private mode, quota) — the in-memory counter still tracks this tab.
  }
}

/**
 * Counts failed verification-code attempts for one login request without ever storing the code.
 *
 * The count lives in `sessionStorage` under a per-request key so a reload keeps the remaining
 * attempts. Only a number is persisted. The server's `too_many_attempts` result stays
 * authoritative because another tab or device can also spend attempts.
 */
export function useFailedAttempts(requestId: string): {
  failed: number;
  recordFailure: () => number;
} {
  const storageKey = `${STORAGE_PREFIX}${requestId}`;
  const memoryRef = useRef(0);
  const [failed, setFailed] = useState(() => readStoredCount(storageKey) ?? 0);

  const recordFailure = useCallback(() => {
    // Read through storage rather than React state: two rapid mismatches in one tab must not
    // both start from a stale render value.
    const current = readStoredCount(storageKey) ?? memoryRef.current;
    const next = current + 1;
    memoryRef.current = next;
    writeStoredCount(storageKey, next);
    setFailed(next);
    return next;
  }, [storageKey]);

  return { failed, recordFailure };
}
