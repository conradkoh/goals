import { useEffect, useState } from 'react';

/**
 * Options for the useDomMeasurement hook
 */
export interface UseDomMeasurementOptions {
  /**
   * Minimum difference in pixels to consider a measurement significantly different
   * @default 5
   */
  significantDifference?: number;

  /**
   * Whether to observe resize changes on the element
   * @default true
   */
  observeResize?: boolean;
}

/**
 * Result of the useDomMeasurement hook
 */
export interface DomMeasurement {
  /** Width of the element in pixels */
  width: number;
  /** Height of the element in pixels */
  height: number;
  /** Whether the element has been measured */
  isReady: boolean;
  /** Whether the element's dimensions have stabilized */
  isStable: boolean;
}

/**
 * Hook to measure DOM element dimensions after render
 *
 * @param elementRef - React ref object pointing to the element to measure
 * @param options - Configuration options
 * @returns Object containing width, height, and status flags
 *
 * @example
 * ```tsx
 * const elementRef = useRef<HTMLDivElement>(null);
 * const { width, height, isReady } = useDomMeasurement(elementRef);
 *
 * // Use width and height after isReady is true
 * useEffect(() => {
 *   if (isReady) {
 *     // Do something with the measurements
 *   }
 * }, [isReady, width, height]);
 * ```
 */
export function useDomMeasurement<T extends HTMLElement>(
  elementRef: React.RefObject<T>,
  options: UseDomMeasurementOptions = {}
): DomMeasurement {
  const { significantDifference = 5, observeResize = true } = options;

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);
  const [isStable, setIsStable] = useState(false);
  const [previousDimensions, setPreviousDimensions] = useState({
    width: 0,
    height: 0,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: state dependencies intentionally excluded to prevent infinite loops
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Function to measure the element
    const measureElement = () => {
      const rect = element.getBoundingClientRect();
      const newWidth = rect.width;
      const newHeight = rect.height;

      // Check if dimensions have changed significantly
      const hasSignificantChange =
        Math.abs(newWidth - previousDimensions.width) > significantDifference ||
        Math.abs(newHeight - previousDimensions.height) > significantDifference;

      // Update previous dimensions for next comparison
      setPreviousDimensions({ width: newWidth, height: newHeight });

      // Update current dimensions
      setDimensions({ width: newWidth, height: newHeight });

      // Mark as ready after first measurement
      if (!isReady) {
        setIsReady(true);
      }

      // Mark as stable if no significant change
      setIsStable(!hasSignificantChange);
    };

    // Measure immediately after render
    setTimeout(measureElement, 0);

    // Set up resize observer if requested
    let resizeObserver: ResizeObserver | null = null;
    if (observeResize) {
      resizeObserver = new ResizeObserver(measureElement);
      resizeObserver.observe(element);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [elementRef.current, significantDifference, observeResize]);

  return {
    width: dimensions.width,
    height: dimensions.height,
    isReady,
    isStable,
  };
}
