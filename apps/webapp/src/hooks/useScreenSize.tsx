'use client';

import { useEffect, useState } from 'react';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export const useScreenSize = (): {
  screenSize: ScreenSize;
  isMobile: boolean;
  isDesktop: boolean;
} => {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');

  useEffect(() => {
    // Set initial screen size
    updateScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', updateScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const updateScreenSize = () => {
    const width = window.innerWidth;
    if (width < 768) {
      setScreenSize('mobile');
    } else if (width < 1024) {
      setScreenSize('tablet');
    } else {
      setScreenSize('desktop');
    }
  };

  return {
    screenSize,
    isMobile: screenSize === 'mobile',
    isDesktop: screenSize === 'desktop' || screenSize === 'tablet',
  };
};
