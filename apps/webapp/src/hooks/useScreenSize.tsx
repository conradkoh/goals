'use client';

import { useEffect, useState } from 'react';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export const useScreenSize = (): {
  screenSize: ScreenSize;
  isMobile: boolean;
  isDesktop: boolean;
} => {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => getScreenSize());

  // biome-ignore lint/correctness/useExhaustiveDependencies: updateScreenSize is stable and doesn't need to be in deps
  useEffect(() => {
    // Set initial screen size
    updateScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', updateScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const updateScreenSize = () => {
    const screenSize = getScreenSize();
    setScreenSize(screenSize);
  };

  return {
    screenSize: screenSize ?? 'desktop',
    isMobile: screenSize === 'mobile',
    isDesktop: screenSize === 'desktop' || screenSize === 'tablet',
  };
};

function getScreenSize() {
  const width = window.innerWidth;
  if (width < 768) {
    return 'mobile';
  }
  if (width < 1024) {
    return 'tablet';
  }
  return 'desktop';
}
