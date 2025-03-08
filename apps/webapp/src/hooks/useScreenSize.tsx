'use client';

import { useEffect, useState } from 'react';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export const useScreenSize = (): {
  screenSize: ScreenSize;
  isMobile: boolean;
  isDesktop: boolean;
} => {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() =>
    getScreenSize()
  );

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
  } else if (width < 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}
