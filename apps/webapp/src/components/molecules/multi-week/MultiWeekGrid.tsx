import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { useCenteredScroll, useCalculatedThenMeasured } from '@/lib/scroll';

// Layout Constants
const MOBILE_BREAKPOINT = 768;
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

  // Calculate card width based on container width
  const { value: cardWidth } = useCalculatedThenMeasured({
    calculateFn: () => DEFAULT_CARD_WIDTH,
    measureFn: () => {
      if (!containerRef.current) return DEFAULT_CARD_WIDTH;
      const containerWidth = containerRef.current.clientWidth;
      return containerWidth < MOBILE_BREAKPOINT
        ? Math.min(containerWidth - 32, DEFAULT_CARD_WIDTH)
        : DEFAULT_CARD_WIDTH;
    },
    dependencies: [],
  });

  // Use our centered scroll hook
  const {
    isItemVisible: isCurrentWeekVisible,
    isItemToRight: isCurrentWeekToRight,
    scrollToItem: scrollToCurrentWeek,
    checkItemVisibility: checkCurrentWeekVisibility,
  } = useCenteredScroll(containerRef as React.RefObject<HTMLElement>, {
    itemIndex: currentIndex,
    itemCount: numItems,
    visibilityThreshold: { mobile: 0.9, desktop: 0.7 },
    mobileBreakpoint: MOBILE_BREAKPOINT,
    autoScrollOnMount: true,
    gridContentSelector: '#multi-week-grid-content > div',
  });

  // Check visibility when currentIndex changes
  useEffect(() => {
    checkCurrentWeekVisibility();
  }, [currentIndex, checkCurrentWeekVisibility]);

  return (
    <div
      ref={containerRef}
      className={cn('relative flex flex-col overflow-hidden', className)}
    >
      {/* Floating Jump to Current Week Button */}
      {showJumpToCurrentWeek && (
        <button
          onClick={() => scrollToCurrentWeek(true)}
          style={{
            position: 'absolute',
            top: `${JUMP_BUTTON_OFFSET.TOP}px`,
            right:
              containerRef.current &&
              containerRef.current.clientWidth < MOBILE_BREAKPOINT
                ? `${JUMP_BUTTON_OFFSET.RIGHT_MOBILE}px`
                : `${JUMP_BUTTON_OFFSET.RIGHT_DESKTOP}px`,
            zIndex: 10,
          }}
          className={cn(
            'flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium text-blue-600 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-blue-100 transition-all duration-200',
            isCurrentWeekVisible
              ? 'opacity-0 pointer-events-none translate-y-1'
              : 'opacity-100 hover:bg-blue-50'
          )}
        >
          {isCurrentWeekToRight ? (
            <>
              <span className="hidden md:inline">
                Jump forward to current week
              </span>
              <span className="md:hidden">Current week</span>
              <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </>
          ) : (
            <>
              <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5 rotate-180" />
              <span className="hidden md:inline">
                Jump back to current week
              </span>
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
          className="flex-grow grid grid-flow-col gap-4 h-full py-2"
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
