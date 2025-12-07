# Scroll Utility Hooks

This library provides a collection of React hooks for handling DOM measurements, scroll positioning, and element centering in scrollable containers. These hooks are designed to solve common UI challenges related to scrolling and element positioning.

## Table of Contents

- [Overview](#overview)
- [Hooks](#hooks)
  - [useDomMeasurement](#usedomeasurement)
  - [useCalculatedThenMeasured](#usecalculatedthenmeasured)
  - [useCenteredScroll](#usecenteredscroll)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

## Overview

The scroll utility library addresses several common challenges in web development:

1. **Timing Issues**: Measuring DOM elements before they're fully rendered
2. **Scroll Positioning**: Centering elements in scrollable containers
3. **Visibility Detection**: Determining if elements are visible within a viewport
4. **Responsive Behavior**: Adapting to different screen sizes

## Hooks

### useDomMeasurement

A hook for measuring DOM elements after they've been rendered.

```typescript
function useDomMeasurement<T extends HTMLElement>(
  ref: React.RefObject<T>,
  dependencies: React.DependencyList = []
): {
  width: number;
  height: number;
  isReady: boolean;
  isLoading: boolean;
  hasError: boolean;
};
```

#### Parameters

- `ref`: A React ref object pointing to the DOM element to measure
- `dependencies`: An array of dependencies that trigger re-measurement when changed

#### Returns

- `width`: The measured width of the element in pixels
- `height`: The measured height of the element in pixels
- `isReady`: Whether the measurement is complete and valid
- `isLoading`: Whether the measurement is in progress
- `hasError`: Whether an error occurred during measurement

#### Example

```tsx
const MyComponent = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height, isReady } = useDomMeasurement(ref);

  return (
    <div ref={ref} className="my-element">
      {isReady && (
        <p>
          Element dimensions: {width}px × {height}px
        </p>
      )}
    </div>
  );
};
```

### useCalculatedThenMeasured

A two-phase hook that first calculates values and then measures them from the DOM.

```typescript
function useCalculatedThenMeasured<T>({
  calculateFn,
  measureFn,
  isSignificantDifference = defaultIsSignificantDifference,
  dependencies = [],
}: {
  calculateFn: () => T;
  measureFn: () => T;
  isSignificantDifference?: (calculated: T, measured: T) => boolean;
  dependencies?: React.DependencyList;
}): {
  value: T;
  calculated: T;
  measured: T | null;
  isCalculated: boolean;
  isMeasured: boolean;
  isSignificantlyDifferent: boolean;
};
```

#### Parameters

- `calculateFn`: Function that calculates the initial value
- `measureFn`: Function that measures the actual value from the DOM
- `isSignificantDifference`: Function that determines if the difference between calculated and measured values is significant
- `dependencies`: Array of dependencies that trigger recalculation

#### Returns

- `value`: The current value (calculated or measured, depending on state)
- `calculated`: The calculated value
- `measured`: The measured value (null if not yet measured)
- `isCalculated`: Whether the calculation phase is complete
- `isMeasured`: Whether the measurement phase is complete
- `isSignificantlyDifferent`: Whether there's a significant difference between calculated and measured values

#### Example

```tsx
const CardGrid = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { value: cardWidth } = useCalculatedThenMeasured({
    // Initial calculation based on default values
    calculateFn: () => 320, // Default card width

    // Actual measurement from DOM
    measureFn: () => {
      if (!containerRef.current) return 320;
      const containerWidth = containerRef.current.clientWidth;
      return containerWidth < 768 ? Math.min(containerWidth - 32, 320) : 320;
    },
    dependencies: [],
  });

  return (
    <div ref={containerRef} className="card-grid">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(auto-fill, ${cardWidth}px)`,
        }}
      >
        {/* Card items */}
      </div>
    </div>
  );
};
```

### useCenteredScroll

A hook for centering items in a scrollable container and detecting their visibility.

```typescript
function useCenteredScroll(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    itemIndex: number;
    itemCount: number;
    visibilityThreshold?: number | { mobile: number; desktop: number };
    mobileBreakpoint?: number;
    autoScrollOnMount?: boolean;
    gridContentSelector?: string;
  }
): {
  isItemVisible: boolean;
  isItemToRight: boolean;
  scrollToItem: (smooth?: boolean) => void;
  checkItemVisibility: () => boolean | undefined;
};
```

#### Parameters

- `containerRef`: A React ref object pointing to the container element
- `options`: Configuration options
  - `itemIndex`: The index of the item to center
  - `itemCount`: The total number of items
  - `visibilityThreshold`: Threshold for considering an item visible (0-1)
  - `mobileBreakpoint`: Breakpoint for mobile view in pixels
  - `autoScrollOnMount`: Whether to automatically scroll to the item on mount
  - `gridContentSelector`: CSS selector for the grid content element

#### Returns

- `isItemVisible`: Whether the current item is visible according to the visibility threshold
- `isItemToRight`: Whether the current item is to the right of the viewport center
- `scrollToItem`: Function to scroll to the current item
- `checkItemVisibility`: Function to check if the current item is visible

#### Example

```tsx
const MultiWeekGrid = ({ currentIndex, numItems }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    isItemVisible: isCurrentWeekVisible,
    isItemToRight: isCurrentWeekToRight,
    scrollToItem: scrollToCurrentWeek,
    checkItemVisibility: checkCurrentWeekVisibility,
  } = useCenteredScroll(containerRef as React.RefObject<HTMLElement>, {
    itemIndex: currentIndex,
    itemCount: numItems,
    visibilityThreshold: { mobile: 0.9, desktop: 0.7 },
    mobileBreakpoint: 768,
    autoScrollOnMount: true,
    gridContentSelector: '#grid-content > div',
  });

  // Jump to current week button
  const handleJumpToCurrentWeek = () => {
    scrollToCurrentWeek(true); // true for smooth scrolling
  };

  return (
    <div ref={containerRef} className="grid-container">
      {!isCurrentWeekVisible && (
        <button onClick={handleJumpToCurrentWeek}>
          Jump to current week
          {isCurrentWeekToRight ? ' →' : ' ←'}
        </button>
      )}

      <div id="grid-content" className="overflow-x-auto">
        <div className="grid grid-flow-col">{/* Grid items */}</div>
      </div>
    </div>
  );
};
```

## Usage Examples

### Horizontal Scrolling Grid with Centered Items

```tsx
import { useCenteredScroll, useCalculatedThenMeasured } from '@/lib/scroll';

const HorizontalGrid = ({ items, currentIndex }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate item width based on container and screen size
  const { value: itemWidth } = useCalculatedThenMeasured({
    calculateFn: () => 320, // Default width
    measureFn: () => {
      if (!containerRef.current) return 320;
      const containerWidth = containerRef.current.clientWidth;
      return containerWidth < 768 ? Math.min(containerWidth - 32, 320) : 320;
    },
    dependencies: [],
  });

  // Set up centered scrolling
  const { isItemVisible, isItemToRight, scrollToItem, checkItemVisibility } =
    useCenteredScroll(containerRef as React.RefObject<HTMLElement>, {
      itemIndex: currentIndex,
      itemCount: items.length,
      autoScrollOnMount: true,
      gridContentSelector: '#grid-content > div',
    });

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Jump button - only shown when current item is not visible */}
      {!isItemVisible && (
        <button
          onClick={() => scrollToItem(true)}
          className="absolute top-4 right-4 z-10"
        >
          Jump to current item
          {isItemToRight ? ' →' : ' ←'}
        </button>
      )}

      {/* Grid content */}
      <div id="grid-content" className="overflow-x-auto px-4">
        <div
          className="grid grid-flow-col gap-4"
          style={{
            gridTemplateColumns: `repeat(${items.length}, ${itemWidth}px)`,
          }}
        >
          {items.map((item, index) => (
            <div key={index} className="card">
              {item.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## Best Practices

1. **DOM Structure**: The `useCenteredScroll` hook expects a specific DOM structure:

   - A container element with the ref
   - A scrollable element (identified by `gridContentSelector`)
   - Child elements representing the items to scroll between

2. **Performance**:

   - Use the `dependencies` array in `useCalculatedThenMeasured` to minimize unnecessary recalculations
   - Consider debouncing window resize handlers for better performance

3. **Responsive Design**:

   - Provide different visibility thresholds for mobile and desktop
   - Use the `mobileBreakpoint` option to define when to switch between mobile and desktop behavior

4. **Error Handling**:

   - The hooks include built-in null checks for refs and DOM elements
   - Always check the `isReady` flag before using measured values

5. **Accessibility**:
   - When implementing scroll buttons, ensure they have appropriate ARIA labels
   - Consider adding keyboard navigation support alongside scroll functionality
