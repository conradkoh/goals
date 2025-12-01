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
 * Return type for the useDeviceScreenInfo hook.
 */
interface _UseDeviceScreenInfoReturn {
  /** Current screen size category */
  screenSize: ScreenSize;
  /** True when viewport width is less than 768px */
  isMobile: boolean;
  /** True when viewport width is 768px or greater */
  isDesktop: boolean;
  /** True after client-side hydration (when values reflect actual screen size) */
  isHydrated: boolean;
  /** True when viewport height is constrained (< 700px) - useful for modal positioning */
  hasLimitedHeight: boolean;
  /** True when device has touch capability (coarse pointer) */
  isTouchDevice: boolean;
  /** True when fullscreen dialogs should be preferred over popovers */
  preferFullscreenDialogs: boolean;
}

/**
 * SSR-safe hook for detecting responsive breakpoints and device capabilities.
 * Returns safe defaults during SSR/initial render to avoid hydration mismatches,
 * then updates to actual values after mount.
 *
 * In addition to width-based breakpoints, this hook also detects:
 * - Limited vertical height (for modal positioning on landscape/small screens)
 * - Touch capability (for optimizing touch interactions)
 * - Combined signals for preferring fullscreen dialogs over popovers
 *
 * @returns Object containing screen size, device capabilities, and hydration state
 *
 * @example
 * ```tsx
 * const { isMobile, preferFullscreenDialogs, isHydrated } = useDeviceScreenInfo();
 *
 * // Wait for hydration before using responsive UI
 * if (isHydrated && preferFullscreenDialogs) {
 *   return <FullscreenDialog />;
 * }
 * ```
 */
export const useDeviceScreenInfo = (): _UseDeviceScreenInfoReturn => {
  // Always start with 'desktop' to match server render and avoid hydration mismatch
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');
  const [hasLimitedHeight, setHasLimitedHeight] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
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

    /** Checks if viewport height is constrained */
    const _hasLimitedHeight = (): boolean => {
      // 700px threshold: below this, popovers often position poorly
      return window.innerHeight < 700;
    };

    /** Detects touch capability via media query */
    const _isTouchDevice = (): boolean => {
      // Check for coarse pointer (touch) vs fine pointer (mouse)
      return window.matchMedia('(pointer: coarse)').matches;
    };

    /** Updates all screen-related state */
    const _updateScreenInfo = () => {
      setScreenSize(_getScreenSize());
      setHasLimitedHeight(_hasLimitedHeight());
      setIsTouchDevice(_isTouchDevice());
    };

    // Set initial values on mount
    _updateScreenInfo();
    setIsHydrated(true);

    // Add event listener for window resize
    window.addEventListener('resize', _updateScreenInfo);

    // Cleanup
    return () => window.removeEventListener('resize', _updateScreenInfo);
  }, []);

  const isMobile = screenSize === 'mobile';

  // Prefer fullscreen dialogs on touch devices.
  // Popovers require precise positioning and can be difficult to interact
  // with on touch screens. Fullscreen dialogs provide a better UX.
  const preferFullscreenDialogs = isTouchDevice;

  return {
    screenSize,
    isMobile,
    isDesktop: screenSize === 'desktop' || screenSize === 'tablet',
    isHydrated,
    hasLimitedHeight,
    isTouchDevice,
    preferFullscreenDialogs,
  };
};
