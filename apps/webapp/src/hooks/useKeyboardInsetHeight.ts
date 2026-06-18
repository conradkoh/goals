'use client';

import { useEffect, useState } from 'react';

import { computeKeyboardInset } from '@/lib/keyboard/computeKeyboardInset';

/**
 * Returns the height (in CSS px) the on-screen keyboard overlaps the bottom of the
 * layout viewport, derived from `window.visualViewport`.
 *
 * Use this to inset fixed/fullscreen surfaces (e.g. dialogs) so their content stays
 * visible above the keyboard on mobile/PWA. Returns 0 on desktop, during SSR, and
 * whenever `visualViewport` is unavailable.
 */
export function useKeyboardInsetHeight(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      setInset(computeKeyboardInset(viewport, window.innerHeight));
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
