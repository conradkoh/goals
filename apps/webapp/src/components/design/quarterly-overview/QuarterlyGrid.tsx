import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

// Layout Constants
const MAX_VISIBLE_COLS = 4;
const CONTAINER_X_PADDING = 64; // 8 * 8 (tailwind px-8)
const GAP_WIDTH = 16; // tailwind gap-4
const GRID_GAP = 16; // matches gap-4
const TARGET_COLUMN_INDEX = 2; // Center column for scroll positioning
const JUMP_BUTTON_OFFSET = {
  TOP: 16, // tailwind top-4
  RIGHT: 32, // tailwind right-8
};

// Animation Constants
const BUTTON_ANIMATION = {
  DURATION: 100,
  TRANSLATE_Y: 1,
};

interface QuarterlyGridProps {
  children: React.ReactNode;
  currentIndex: number;
  numItems: number;
}

function computeCardWidth(containerWidth: number) {
  const numGaps = MAX_VISIBLE_COLS - 1;
  const cardsOnlyWidth =
    containerWidth - CONTAINER_X_PADDING - numGaps * GAP_WIDTH;
  const cardWidth = cardsOnlyWidth / MAX_VISIBLE_COLS;

  return cardWidth;
}

export const QuarterlyGrid = ({
  children,
  currentIndex,
  numItems,
}: QuarterlyGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToCenter = useRef(false);
  const [isCurrentWeekVisible, setIsCurrentWeekVisible] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);

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

    // Only scroll if we're beyond MAX_VISIBLE_COLS
    if (currentIndex < MAX_VISIBLE_COLS) return 0;

    const scrollDistance =
      (currentIndex + 1 - TARGET_COLUMN_INDEX) * (cardWidth + gapWidth);
    return Math.max(0, scrollDistance);
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
    const cardWidth = computeCardWidth(containerWidth);

    // Calculate the left edge position of the current week card relative to viewport
    const currentWeekLeft =
      currentIndex * (cardWidth + GAP_WIDTH) - container.scrollLeft;

    // Consider it visible if any part of the card is in view
    setIsCurrentWeekVisible(
      currentWeekLeft > -cardWidth && currentWeekLeft < containerWidth
    );
  };

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      checkCurrentWeekVisibility();
    };

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    // Initial check
    checkCurrentWeekVisibility();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [currentIndex]);

  // Initial scroll to center effect
  useEffect(() => {
    if (containerRef.current && !hasScrolledToCenter.current && numItems > 0) {
      const scrollPosition = calculateScrollPosition();
      scrollToPosition(scrollPosition, false);
      checkCurrentWeekVisibility();
      hasScrolledToCenter.current = true;
    }
  }, [numItems, currentIndex]);

  return (
    <div
      id="quarterly-grid"
      ref={containerRef}
      className="relative flex-1 h-full overflow-auto"
    >
      <button
        onClick={scrollToCurrentWeek}
        style={{
          top: `${JUMP_BUTTON_OFFSET.TOP}px`,
          right: `${JUMP_BUTTON_OFFSET.RIGHT}px`,
        }}
        className={cn(
          'fixed z-10 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-blue-100 transition-all',
          `duration-${BUTTON_ANIMATION.DURATION}`,
          isCurrentWeekVisible
            ? `opacity-0 pointer-events-none translate-y-${BUTTON_ANIMATION.TRANSLATE_Y}`
            : 'opacity-100 hover:bg-blue-50'
        )}
      >
        Jump to current week
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
      <div id="quarterly-grid-container" className={`flex-1 px-8 py-2`}>
        <div
          className="grid grid-flow-col gap-4 h-full pb-4"
          style={{
            width: `${gridWidth}px`,
            gridTemplateColumns: `repeat(${numItems}, 1fr)`,
            gap: `${GRID_GAP}px`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
