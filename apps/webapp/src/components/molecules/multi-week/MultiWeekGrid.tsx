import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

// Layout Constants
const DESKTOP_VISIBLE_COLS = 2; // Changed from 4 to 2 for desktop
const MOBILE_VISIBLE_COLS = 1; // Added for mobile
const MOBILE_BREAKPOINT = 768; // Standard md breakpoint
const DESKTOP_CONTAINER_X_PADDING = 64; // 8 * 8 (tailwind px-8)
const MOBILE_CONTAINER_X_PADDING = 32; // 4 * 8 (tailwind px-4)
const GAP_WIDTH = 16; // tailwind gap-4
const GRID_GAP = 16; // matches gap-4
const TARGET_COLUMN_INDEX = 0; // Center column for scroll positioning (will be adjusted to center current card)
const JUMP_BUTTON_OFFSET = {
  TOP: 16, // tailwind top-4
  RIGHT_DESKTOP: 32, // tailwind right-8
  RIGHT_MOBILE: 16, // tailwind right-4
};

interface MultiWeekGridProps {
  children: React.ReactNode;
  currentIndex: number;
  numItems: number;
}

function computeCardWidth(containerWidth: number) {
  // Determine if we're in mobile view
  const isMobile = containerWidth < MOBILE_BREAKPOINT;
  const visibleCols = isMobile ? MOBILE_VISIBLE_COLS : DESKTOP_VISIBLE_COLS;
  const containerPadding = isMobile
    ? MOBILE_CONTAINER_X_PADDING
    : DESKTOP_CONTAINER_X_PADDING;

  const numGaps = visibleCols - 1;
  const cardsOnlyWidth =
    containerWidth - containerPadding - numGaps * GAP_WIDTH;
  const cardWidth = cardsOnlyWidth / visibleCols;

  return cardWidth;
}

export const MultiWeekGrid = ({
  children,
  currentIndex,
  numItems,
}: MultiWeekGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToCenter = useRef(false);
  const [isCurrentWeekVisible, setIsCurrentWeekVisible] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isCurrentWeekToRight, setIsCurrentWeekToRight] = useState(true);

  // Update dimensions when container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateContainerWidth = () => {
      setContainerWidth(container.clientWidth);
    };

    // Create a ResizeObserver to watch container size changes
    const resizeObserver = new ResizeObserver(updateContainerWidth);
    resizeObserver.observe(container);

    // Initial width calculation
    updateContainerWidth();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const { cardWidth, gapWidth, gridWidth } = useMemo(() => {
    const cardWidth = computeCardWidth(containerWidth);
    const gridWidth = numItems * cardWidth + (numItems - 1) * GAP_WIDTH;
    return { cardWidth, gapWidth: GAP_WIDTH, gridWidth };
  }, [numItems, containerWidth]); // Add containerWidth as dependency
  const calculateScrollPosition = () => {
    const container = containerRef.current;
    if (!container || currentIndex === -1) return 0;

    // Get the card width based on current container width
    const isMobile = containerWidth < MOBILE_BREAKPOINT;
    const visibleCols = isMobile ? MOBILE_VISIBLE_COLS : DESKTOP_VISIBLE_COLS;

    // For mobile, we want to align exactly to the current card (no partial cards)
    // For desktop with 2 columns, we center the current card
    if (isMobile) {
      // For mobile, exactly align to the current card
      const scroll = currentIndex * (cardWidth + gapWidth);
      return scroll;
    } else {
      // For desktop, center the current card
      const offset = visibleCols / 2 - 0.5;
      const scrollDistance = (currentIndex - offset) * (cardWidth + gapWidth);
      return Math.max(0, scrollDistance);
    }
  };

  const scrollToPosition = (position: number, smooth = false) => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      left: position,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  const scrollToCurrentWeek = () => {
    const scrollPosition = calculateScrollPosition();
    scrollToPosition(scrollPosition, true);
  };

  // Check if current week is visible
  const checkCurrentWeekVisibility = () => {
    const container = containerRef.current;
    if (!container || currentIndex === -1) return;

    const containerWidth = container.clientWidth;
    const isMobile = containerWidth < MOBILE_BREAKPOINT;
    const cardWidth = computeCardWidth(containerWidth);

    // Calculate the visible range (what cards are visible in the viewport)
    const scrollLeft = container.scrollLeft;
    const visibleLeftEdge = scrollLeft;
    const visibleRightEdge = scrollLeft + containerWidth;

    // Calculate the center point of the visible area
    const visibleCenter = visibleLeftEdge + containerWidth / 2;

    // Calculate the position of the current week card
    const currentCardLeftEdge = currentIndex * (cardWidth + GAP_WIDTH);
    const currentCardRightEdge = currentCardLeftEdge + cardWidth;
    const currentCardCenter = currentCardLeftEdge + cardWidth / 2;

    // Determine if current week is to the right of the viewport's center
    // Add a small buffer (5px) to avoid flickering if it's very close to center
    const centerDistance = currentCardCenter - visibleCenter;
    setIsCurrentWeekToRight(centerDistance > 5);

    // On mobile, a card is considered visible only if it's almost fully visible (90%)
    // On desktop, a card is considered visible if at least 70% is visible
    const visibilityThreshold = isMobile ? 0.9 : 0.7;
    const cardVisibleWidth =
      Math.min(currentCardRightEdge, visibleRightEdge) -
      Math.max(currentCardLeftEdge, visibleLeftEdge);

    // If card is off-screen, cardVisibleWidth will be negative
    const percentVisible = Math.max(0, cardVisibleWidth) / cardWidth;

    setIsCurrentWeekVisible(percentVisible >= visibilityThreshold);
  };

  // Handle scroll events with proper dependency array
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Clear previous timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      // Debounce the visibility check to avoid excessive calculations
      scrollTimeout = setTimeout(() => {
        checkCurrentWeekVisibility();
      }, 50);
    };

    const handleResize = () => {
      // On resize, handle visibility check and potentially recenter
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = setTimeout(() => {
        checkCurrentWeekVisibility();

        // If current week is not visible after resize, recenter it
        if (!isCurrentWeekVisible && hasScrolledToCenter.current) {
          const scrollPosition = calculateScrollPosition();
          scrollToPosition(scrollPosition, true);
        }
      }, 100);
    };

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    // Initial check
    checkCurrentWeekVisibility();

    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentIndex, isCurrentWeekVisible, cardWidth, gapWidth, containerWidth]); // Added containerWidth

  // Update dependency array to include all used values
  useEffect(() => {
    if (
      containerRef.current &&
      containerWidth > 0 &&
      !hasScrolledToCenter.current &&
      numItems > 0
    ) {
      // First scroll without animation
      const scrollPosition = calculateScrollPosition();
      scrollToPosition(scrollPosition, false);

      // After initial render, check visibility after a short delay
      // This ensures the DOM has fully rendered and measurements are accurate
      setTimeout(() => {
        checkCurrentWeekVisibility();
        hasScrolledToCenter.current = true;
      }, 100);
    }
  }, [numItems, currentIndex, containerWidth]);

  // When container width changes or window resizes, recalculate scroll position
  useEffect(() => {
    if (
      containerRef.current &&
      containerWidth > 0 &&
      hasScrolledToCenter.current
    ) {
      // Only recenter if the current week is not visible
      if (!isCurrentWeekVisible) {
        const scrollPosition = calculateScrollPosition();
        scrollToPosition(scrollPosition, true);
      }
    }
  }, [containerWidth]);

  return (
    <div
      id="multi-week-grid"
      ref={containerRef}
      className="relative flex-1 h-full overflow-auto"
    >
      <button
        onClick={scrollToCurrentWeek}
        style={{
          top: `${JUMP_BUTTON_OFFSET.TOP}px`,
          right:
            containerWidth < MOBILE_BREAKPOINT
              ? `${JUMP_BUTTON_OFFSET.RIGHT_MOBILE}px`
              : `${JUMP_BUTTON_OFFSET.RIGHT_DESKTOP}px`,
        }}
        className={cn(
          'fixed z-10 flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium text-blue-600 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-blue-100 transition-all duration-200',
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
            <span className="hidden md:inline">Jump back to current week</span>
            <span className="md:hidden">Current week</span>
          </>
        )}
      </button>
      <div
        id="quarterly-grid-container"
        className="min-h-full flex-1 px-4 md:px-8 py-2"
      >
        <div
          className="grid grid-flow-col gap-4 h-full pb-4"
          style={{
            width: `${gridWidth}px`,
            gridTemplateColumns: `repeat(${numItems}, minmax(${
              containerWidth < MOBILE_BREAKPOINT ? '90vw' : 'auto'
            }, 1fr))`,
            gap: `${GRID_GAP}px`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
