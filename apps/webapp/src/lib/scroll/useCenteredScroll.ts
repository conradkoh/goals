import { useCallback, useEffect, useState } from 'react';

/**
 * Options for the useCenteredScroll hook
 */
export interface UseCenteredScrollOptions {
  /**
   * The index of the item to center
   */
  itemIndex: number;

  /**
   * Threshold for considering an item visible (0-1)
   * 1 means fully visible, 0.5 means half visible
   * @default 0.7 for desktop, 0.9 for mobile
   */
  visibilityThreshold?: number | { mobile: number; desktop: number };

  /**
   * Breakpoint for mobile view in pixels
   * @default 768
   */
  mobileBreakpoint?: number;

  /**
   * Whether to automatically scroll to the item on mount
   * @default true
   */
  autoScrollOnMount?: boolean;

  /**
   * CSS selector for the grid content element
   * @default '#multi-week-grid-content'
   */
  gridContentSelector?: string;
}

/**
 * Result of the useCenteredScroll hook
 */
export interface CenteredScrollResult {
  /** Whether the current item is visible according to the visibility threshold */
  isItemVisible: boolean;

  /** Whether the current item is to the right of the viewport center */
  isItemToRight: boolean;

  /** Function to scroll to the current item */
  scrollToItem: (smooth?: boolean) => void;

  /** Function to check if the current item is visible */
  checkItemVisibility: () => boolean | undefined;
}

/**
 * Hook to handle centering an item in a scrollable container
 *
 * @param containerRef - React ref object pointing to the scrollable container
 * @param options - Configuration options
 * @returns Object containing visibility state and scroll functions
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { isItemVisible, isItemToRight, scrollToItem } = useCenteredScroll(
 *   containerRef,
 *   { itemIndex: currentIndex, itemCount: items.length }
 * );
 *
 * // Use scrollToItem to center the current item
 * const handleJumpToCurrentItem = () => {
 *   scrollToItem(true); // true for smooth scrolling
 * };
 * ```
 */
export function useCenteredScroll(
  containerRef: React.RefObject<HTMLElement>,
  options: UseCenteredScrollOptions
): CenteredScrollResult {
  const {
    itemIndex,
    visibilityThreshold = { mobile: 0.9, desktop: 0.7 },
    mobileBreakpoint = 768,
    autoScrollOnMount = true,
    gridContentSelector = '#multi-week-grid-content',
  } = options;

  const [isItemVisible, setIsItemVisible] = useState(true);
  const [isItemToRight, setIsItemToRight] = useState(false);

  // Helper function to get the scrollable container
  const getScrollableContainer = useCallback(() => {
    if (!containerRef.current) return null;

    return containerRef.current.querySelector(
      gridContentSelector.split('>')[0].trim()
    ) as HTMLElement | null;
  }, [containerRef, gridContentSelector]);

  // Helper function to get the grid content element
  const getGridContent = useCallback(() => {
    if (!containerRef.current) return null;

    return containerRef.current.querySelector(gridContentSelector) as HTMLElement | null;
  }, [containerRef, gridContentSelector]);

  // Scroll to the current item
  const scrollToItem = useCallback(
    (smooth = true) => {
      if (!containerRef.current) return;

      // Find the scrollable container
      const scrollableContainer = getScrollableContainer();
      if (!scrollableContainer) return;

      const gridContent = getGridContent();
      if (!gridContent) return;

      const items = Array.from(gridContent.children);
      if (items.length === 0 || itemIndex < 0 || itemIndex >= items.length) return;

      const targetItem = items[itemIndex] as HTMLElement;
      if (!targetItem) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const targetRect = targetItem.getBoundingClientRect();

      // Calculate the scroll position to center the item
      const containerWidth = containerRect.width;
      const targetWidth = targetRect.width;

      // Calculate the left position of the target relative to the grid content
      const targetLeft = targetItem.offsetLeft;

      // Calculate the scroll position to center the item
      const scrollPosition = targetLeft - containerWidth / 2 + targetWidth / 2;

      // Perform the scroll on the scrollable container
      try {
        scrollableContainer.scrollTo({
          left: scrollPosition,
          behavior: smooth ? 'smooth' : 'auto',
        });
      } catch (_error) {
        // Fallback to direct assignment if scrollTo fails
        scrollableContainer.scrollLeft = scrollPosition;
      }
    },
    [containerRef, itemIndex, getScrollableContainer, getGridContent]
  );

  // Check if the current item is visible
  const checkItemVisibility = useCallback(() => {
    if (!containerRef.current) return;

    // Find the scrollable container
    const scrollableContainer = getScrollableContainer();
    if (!scrollableContainer) return;

    const gridContent = getGridContent();
    if (!gridContent) return;

    const items = Array.from(gridContent.children);
    if (items.length === 0 || itemIndex < 0 || itemIndex >= items.length) {
      setIsItemVisible(false);
      return;
    }

    const targetItem = items[itemIndex] as HTMLElement;
    if (!targetItem) {
      setIsItemVisible(false);
      return;
    }

    const containerRect = scrollableContainer.getBoundingClientRect();
    const targetRect = targetItem.getBoundingClientRect();

    // Calculate visibility
    const containerLeft = containerRect.left;
    const containerRight = containerRect.right;
    const targetLeft = targetRect.left;
    const targetRight = targetRect.right;
    const targetWidth = targetRect.width;

    // Calculate how much of the item is visible
    const visibleLeft = Math.max(containerLeft, targetLeft);
    const visibleRight = Math.min(containerRight, targetRight);
    const visibleWidth = Math.max(0, visibleRight - visibleLeft);
    const visibilityRatio = visibleWidth / targetWidth;

    // Determine if the item is to the left or right of the container
    const isToRight = targetLeft > containerRight - containerRect.width * 0.1;

    // Get the appropriate threshold based on screen size
    const threshold =
      typeof visibilityThreshold === 'object'
        ? window.innerWidth < mobileBreakpoint
          ? visibilityThreshold.mobile
          : visibilityThreshold.desktop
        : visibilityThreshold;

    // Update visibility state
    const isVisible = visibilityRatio >= threshold;

    setIsItemVisible(isVisible);
    setIsItemToRight(isToRight);

    return isVisible;
  }, [
    containerRef,
    itemIndex,
    getScrollableContainer,
    getGridContent,
    mobileBreakpoint,
    visibilityThreshold,
  ]);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find the scrollable container
    const scrollableContainer = getScrollableContainer();
    if (!scrollableContainer) return;

    // Check visibility on initial render
    checkItemVisibility();

    // Add scroll event listener
    const handleScroll = () => {
      checkItemVisibility();
    };

    scrollableContainer.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    // Clean up
    return () => {
      scrollableContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [containerRef, checkItemVisibility, getScrollableContainer]);

  // Auto-scroll to the item on mount if enabled
  useEffect(() => {
    if (autoScrollOnMount) {
      // Use a small delay to ensure the DOM is fully rendered
      const timer = setTimeout(() => {
        scrollToItem(false);

        // Check if we need to scroll again with a smooth animation
        // This helps in cases where the initial scroll might not be accurate
        // due to layout shifts or dynamic content
        setTimeout(() => {
          scrollToItem(true);
        }, 300);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [autoScrollOnMount, scrollToItem]);

  return {
    isItemVisible,
    isItemToRight,
    scrollToItem,
    checkItemVisibility,
  };
}
