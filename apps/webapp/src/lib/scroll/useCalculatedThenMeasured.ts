import { useEffect, useState } from 'react';

/**
 * Options for the useCalculatedThenMeasured hook
 */
export interface UseCalculatedThenMeasuredOptions<T> {
  /**
   * Function to calculate the initial value
   */
  calculateFn: () => T;

  /**
   * Function to measure the actual value from the DOM
   * Should return undefined if measurement is not possible yet
   */
  measureFn: () => T | undefined;

  /**
   * Function to determine if the difference between calculated and measured values is significant
   * @default (calculated, measured) => calculated !== measured
   */
  isSignificantDifference?: (calculated: T, measured: T) => boolean;

  /**
   * Dependencies array for recalculation
   * @default []
   */
  dependencies?: React.DependencyList;
}

/**
 * Result of the useCalculatedThenMeasured hook
 */
export interface CalculatedThenMeasuredResult<T> {
  /** The current value (calculated initially, then measured if different) */
  value: T;
  /** The initially calculated value */
  calculatedValue: T;
  /** The measured value from the DOM, if available */
  measuredValue: T | undefined;
  /** Whether the measurement has been completed */
  isMeasured: boolean;
  /** Whether the value has stabilized (no significant difference between calculated and measured) */
  isStable: boolean;
}

/**
 * Hook that first uses a calculation function for an initial value,
 * then measures the actual value from the DOM and updates if significantly different.
 *
 * @param options - Configuration options
 * @returns Object containing the current value and status flags
 *
 * @example
 * ```tsx
 * const { value, isMeasured } = useCalculatedThenMeasured({
 *   calculateFn: () => computeCardWidth(containerWidth),
 *   measureFn: () => {
 *     if (!cardRef.current) return undefined;
 *     return cardRef.current.getBoundingClientRect().width;
 *   },
 *   isSignificantDifference: (calc, meas) => Math.abs(calc - meas) > 5,
 *   dependencies: [containerWidth]
 * });
 * ```
 */
export function useCalculatedThenMeasured<T>(
  options: UseCalculatedThenMeasuredOptions<T>
): CalculatedThenMeasuredResult<T> {
  const {
    calculateFn,
    measureFn,
    isSignificantDifference = (calculated, measured) => calculated !== measured,
    dependencies = [],
  } = options;

  // Initialize with calculated value
  const [calculatedValue, setCalculatedValue] = useState<T>(() =>
    calculateFn()
  );
  const [measuredValue, setMeasuredValue] = useState<T | undefined>(undefined);
  const [value, setValue] = useState<T>(calculatedValue);
  const [isMeasured, setIsMeasured] = useState(false);
  const [isStable, setIsStable] = useState(false);

  // Recalculate when dependencies change
  useEffect(() => {
    const newCalculatedValue = calculateFn();
    setCalculatedValue(newCalculatedValue);
    setValue(newCalculatedValue);
    setIsMeasured(false);
    setIsStable(false);
  }, dependencies);

  // Measure after render and update if significantly different
  useEffect(() => {
    // Use setTimeout to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const measured = measureFn();

      if (measured !== undefined) {
        setMeasuredValue(measured);
        setIsMeasured(true);

        // Check if the difference is significant
        const significant = isSignificantDifference(calculatedValue, measured);
        setIsStable(!significant);

        // Update value if significantly different
        if (significant) {
          setValue(measured);
        }
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [calculatedValue, ...dependencies]);

  return {
    value,
    calculatedValue,
    measuredValue,
    isMeasured,
    isStable,
  };
}
