'use client';

import { useEffect, useState } from 'react';

/**
 * Returns the current epoch time, refreshed on an interval while `enabled`.
 *
 * Expiry is derived on the client because Convex does not push time-based status changes. The
 * interval only runs while a request is pending to avoid needless renders on terminal screens.
 */
export function useNow(enabled: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [enabled, intervalMs]);

  return now;
}
