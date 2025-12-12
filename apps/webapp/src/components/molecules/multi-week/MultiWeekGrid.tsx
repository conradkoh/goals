import { ArrowRight } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useCalculatedThenMeasured, useCenteredScroll } from '@/lib/scroll';
import { cn } from '@/lib/utils';

// Layout Constants
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const DEFAULT_CARD_WIDTH = 320;
const JUMP_BUTTON_OFFSET = {
  TOP: 16, // tailwind top-4
  RIGHT_DESKTOP: 32, // tailwind right-8
  RIGHT_MOBILE: 16, // tailwind right-4
};

export interface MultiWeekGridProps {
  children: React.ReactNode;
  currentIndex: number;
  numItems: number;
  title?: string;
  showHeader?: boolean;
  showJumpToCurrentWeek?: boolean;
  className?: string;
  gridClassName?: string;
}

export const MultiWeekGrid = ({
  children,
  currentIndex,
  numItems,
  title,
  showHeader = true,
  showJumpToCurrentWeek = true,
  className,
  gridClassName,
}: MultiWeekGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );

  // Listen for window resize events
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Calculate card width based on container width and screen size
  const { value: cardWidth } = useCalculatedThenMeasured({
    calculateFn: () => DEFAULT_CARD_WIDTH,
    measureFn: () => {
      if (!containerRef.current) return DEFAULT_CARD_WIDTH;
      const containerWidth = containerRef.current.clientWidth;

      // Small and medium screens: fit 1 card
      if (containerWidth < TABLET_BREAKPOINT) {
        // Subtract horizontal padding (2 * 16px = 32px) and add some margin
        // Ensure the card has some padding on both sides
        return Math.min(containerWidth - 48, containerWidth * 0.9);
      }

      // Large and XL screens: fit 3 cards
      // Account for horizontal padding (2 * 16px = 32px) and gaps between cards (2 * 24px = 48px for md:gap-6)
      const availableWidth = containerWidth - 32 - 48;
      return Math.floor(availableWidth / 3);
    },
    dependencies: [windowWidth], // Recalculate when window width changes
  });

  // Use our centered scroll hook
  const {
    isItemVisible: isCurrentWeekVisible,
    isItemToRight: isCurrentWeekToRight,
    scrollToItem: scrollToCurrentWeek,
    checkItemVisibility: checkCurrentWeekVisibility,
  } = useCenteredScroll(containerRef as React.RefObject<HTMLElement>, {
    itemIndex: currentIndex,
    visibilityThreshold: {
      mobile: 0.95, // For small/medium screens (1 card) - higher threshold for better visibility
      desktop: 0.6, // For large/XL screens (3 cards) - lower threshold to account for multiple cards
    },
    mobileBreakpoint: TABLET_BREAKPOINT, // Use tablet breakpoint instead of mobile
    autoScrollOnMount: true,
    gridContentSelector: '#multi-week-grid-content > div',
  });

  // Check visibility when currentIndex changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentIndex is tracked internally by checkCurrentWeekVisibility
  useEffect(() => {
    checkCurrentWeekVisibility();
  }, [currentIndex, checkCurrentWeekVisibility]);

  return (
    <div ref={containerRef} className={cn('relative flex flex-col overflow-hidden', className)}>
      {/* Floating Jump to Current Week Button */}
      {showJumpToCurrentWeek && (
        <button
          type="button"
          onClick={() => scrollToCurrentWeek(true)}
          style={{
            position: 'absolute',
            top: `${JUMP_BUTTON_OFFSET.TOP}px`,
            right:
              containerRef.current && containerRef.current.clientWidth < MOBILE_BREAKPOINT
                ? `${JUMP_BUTTON_OFFSET.RIGHT_MOBILE}px`
                : `${JUMP_BUTTON_OFFSET.RIGHT_DESKTOP}px`,
            zIndex: 10,
          }}
          className={cn(
            'flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium text-blue-600 dark:text-blue-400 bg-card/90 backdrop-blur-sm rounded-full shadow-sm border border-blue-100 dark:border-blue-900 transition-all duration-200',
            isCurrentWeekVisible
              ? 'opacity-0 pointer-events-none translate-y-1'
              : 'opacity-100 hover:bg-blue-50 dark:hover:bg-blue-950/30'
          )}
        >
          {isCurrentWeekToRight ? (
            <>
              <span className="hidden md:inline">Jump forward to current week</span>
              <span className="md:hidden">Current week</span>
              <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </>
          ) : (
            <>
              <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5 rotate-180" />
              <span className="hidden md:inline">Jump back to current week</span>
              <span className="md:hidden">Current week</span>
            </>
          )}
        </button>
      )}

      {/* Grid Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-2">
          <div className="text-sm font-medium">{title}</div>
        </div>
      )}

      {/* Grid Content */}
      <div
        id="multi-week-grid-content"
        className={cn('flex flex-1 overflow-x-auto px-4 pb-4', gridClassName)}
      >
        <div
          className="flex-grow grid grid-flow-col gap-4 md:gap-6 lg:gap-6 h-full py-2"
          style={{
            gridTemplateColumns: `repeat(${numItems}, ${cardWidth}px)`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
