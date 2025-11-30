'use client';

import { useEffect, useState } from 'react';

/**
 * Screen size breakpoint values.
 * - mobile: viewport width < 768px
 * - tablet: viewport width >= 768px and < 1024px
 * - desktop: viewport width >= 1024px
 */
export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

/**
 * Return type for the useScreenSize hook.
 */
interface _UseScreenSizeReturn {
  /** Current screen size category */
  screenSize: ScreenSize;
  /** True when viewport width is less than 768px */
  isMobile: boolean;
  /** True when viewport width is 768px or greater */
  isDesktop: boolean;
  /** True after client-side hydration (when values reflect actual screen size) */
  isHydrated: boolean;
}

/**
 * SSR-safe hook for detecting responsive breakpoints.
 * Returns 'desktop' during SSR/initial render to avoid hydration mismatches,
 * then updates to actual screen size after mount.
 *
 * @returns Object containing screen size, convenience booleans, and hydration state
 *
 * @example
 * ```tsx
 * const { isMobile, isHydrated } = useScreenSize();
 *
 * // Wait for hydration before using mobile-specific UI
 * if (isHydrated && isMobile) {
 *   return <MobileLayout />;
 * }
 * ```
 */
export const useScreenSize = (): _UseScreenSizeReturn => {
  // Always start with 'desktop' to match server render and avoid hydration mismatch
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    /** Determines screen size category based on viewport width */
    const _getScreenSize = (): ScreenSize => {
      const width = window.innerWidth;
      if (width < 768) {
        return 'mobile';
      }
      if (width < 1024) {
        return 'tablet';
      }
      return 'desktop';
    };

    /** Updates screen size state based on current viewport */
    const _updateScreenSize = () => {
      setScreenSize(_getScreenSize());
    };

    // Set initial screen size on mount
    _updateScreenSize();
    setIsHydrated(true);

    // Add event listener for window resize
    window.addEventListener('resize', _updateScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', _updateScreenSize);
  }, []);

  return {
    screenSize,
    isMobile: screenSize === 'mobile',
    isDesktop: screenSize === 'desktop' || screenSize === 'tablet',
    isHydrated,
  };
};
