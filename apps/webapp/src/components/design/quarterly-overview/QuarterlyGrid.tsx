import { useEffect, useRef } from 'react';

interface QuarterlyGridProps {
  children: React.ReactNode;
  currentIndex: number;
  numItems: number;
}

export const QuarterlyGrid = ({
  children,
  currentIndex,
  numItems,
}: QuarterlyGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToCenter = useRef(false);

  // Update the scroll to center effect
  useEffect(() => {
    if (containerRef.current && !hasScrolledToCenter.current && numItems > 0) {
      const scrollToCenter = () => {
        const container = containerRef.current;
        if (!container) return;

        // Calculate card width based on container width
        // Container should show 6 weeks
        const containerWidth = container.clientWidth;
        const cardWidth = Math.floor(containerWidth / 6); // Each card takes 1/6 of the container

        if (currentIndex !== -1) {
          // Calculate scroll position to place current week as second week
          const targetPosition = cardWidth; // One card width from the left
          const scrollPosition = Math.max(
            0,
            cardWidth * currentIndex - targetPosition
          );

          container.scrollTo({
            left: scrollPosition,
          });
        }
      };

      // Initial scroll
      scrollToCenter();
      // Ensure layout is complete before final scroll
      setTimeout(scrollToCenter, 100);
      hasScrolledToCenter.current = true;
    }
  }, [numItems, currentIndex]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-x-auto overflow-y-hidden px-6"
    >
      <div className="flex gap-4 h-full pb-4">{children}</div>
    </div>
  );
};
