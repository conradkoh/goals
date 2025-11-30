'use client';

import { useEffect, useState } from 'react';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

/**
 * SSR-safe hook for detecting screen size.
 * Always returns 'desktop' during SSR/initial render to avoid hydration mismatches.
 * Updates to actual screen size after mount.
 */
export const useScreenSize = (): {
  screenSize: ScreenSize;
  isMobile: boolean;
  isDesktop: boolean;
  /** Whether the hook has hydrated and is showing real values */
  isHydrated: boolean;
} => {
  // Always start with 'desktop' to match server render and avoid hydration mismatch
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Now we're on the client, get the actual screen size
    const getScreenSize = (): ScreenSize => {
      const width = window.innerWidth;
      if (width < 768) {
        return 'mobile';
      }
      if (width < 1024) {
        return 'tablet';
      }
      return 'desktop';
    };

    const updateScreenSize = () => {
      setScreenSize(getScreenSize());
    };

    // Set initial screen size on mount
    updateScreenSize();
    setIsHydrated(true);

    // Add event listener for window resize
    window.addEventListener('resize', updateScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return {
    screenSize,
    isMobile: screenSize === 'mobile',
    isDesktop: screenSize === 'desktop' || screenSize === 'tablet',
    isHydrated,
  };
};
