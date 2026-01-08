# Sequential Dialog Dismiss with Escape Key

This guide explains how to implement sequential escape key handling in dialogs, where pressing Escape first closes inner UI elements (like forms) before closing the dialog itself.

## Problem

By default, Radix UI dialogs close immediately when the Escape key is pressed. However, when a dialog contains interactive elements like forms, users often expect:

1. **First Escape**: Close/cancel the active form
2. **Second Escape**: Close the dialog

## Solution Overview

We use a combination of:
1. A ref to track whether an inner element is "active"
2. The `onEscapeKeyDown` prop on `DialogContent` to conditionally prevent dialog close
3. Callbacks to communicate state changes from child components

## Implementation

### Step 1: Create the Escape Handler Hook

Create a reusable hook that manages the escape key behavior:

```tsx
// useLogFormEscapeHandler.ts
import { useCallback, useRef } from 'react';

export function useLogFormEscapeHandler() {
  // Use ref instead of state to avoid re-renders and ensure synchronous access
  const isLogFormActiveRef = useRef(false);

  /**
   * Handles escape key - prevents dialog from closing if a form is active.
   * Call e.preventDefault() to stop the dialog from closing.
   */
  const handleEscapeKeyDown = useCallback((e: KeyboardEvent) => {
    if (isLogFormActiveRef.current) {
      e.preventDefault();
    }
  }, []);

  /**
   * Callback to track when a form becomes active/inactive.
   */
  const handleLogFormActiveChange = useCallback((isActive: boolean) => {
    isLogFormActiveRef.current = isActive;
  }, []);

  return {
    isLogFormActiveRef,
    handleEscapeKeyDown,
    handleLogFormActiveChange,
  };
}
```

### Step 2: Use the Hook in Your Dialog Component

```tsx
// MyDialog.tsx
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useLogFormEscapeHandler } from './useLogFormEscapeHandler';

export function MyDialog({ open, onOpenChange }) {
  const { handleEscapeKeyDown, handleLogFormActiveChange } = useLogFormEscapeHandler();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onEscapeKeyDown={handleEscapeKeyDown}>
        <MyForm onFormActiveChange={handleLogFormActiveChange} />
      </DialogContent>
    </Dialog>
  );
}
```

### Step 3: Implement the Child Component

The child component needs to:
1. Track its own "active" state
2. Notify the parent when the state changes
3. Handle its own Escape key behavior
4. **Clean up on unmount** (important for tabbed interfaces)

```tsx
// MyForm.tsx
import { useState, useEffect, useCallback } from 'react';

interface MyFormProps {
  onFormActiveChange?: (isActive: boolean) => void;
}

export function MyForm({ onFormActiveChange }: MyFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Notify parent when form becomes active/inactive
  useEffect(() => {
    onFormActiveChange?.(isExpanded);
  }, [isExpanded, onFormActiveChange]);

  // IMPORTANT: Reset state when component unmounts (e.g., tab switch)
  useEffect(() => {
    return () => {
      onFormActiveChange?.(false);
    };
  }, [onFormActiveChange]);

  // Handle Escape key within the form
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsExpanded(false);
    }
  }, []);

  if (!isExpanded) {
    return <button onClick={() => setIsExpanded(true)}>Expand Form</button>;
  }

  return (
    <div onKeyDownCapture={handleKeyDown}>
      {/* Form content */}
      <button onClick={() => setIsExpanded(false)}>Cancel</button>
    </div>
  );
}
```

## Key Points

### Why Use a Ref Instead of State?

```tsx
// ✅ Good: Ref provides synchronous access
const isActiveRef = useRef(false);
const handleEscapeKeyDown = useCallback((e: KeyboardEvent) => {
  if (isActiveRef.current) {
    e.preventDefault();
  }
}, []);

// ❌ Bad: State may be stale in the callback
const [isActive, setIsActive] = useState(false);
const handleEscapeKeyDown = useCallback((e: KeyboardEvent) => {
  if (isActive) { // This captures the value at callback creation time
    e.preventDefault();
  }
}, [isActive]); // Adding dependency causes new callback on every change
```

### Why Clean Up on Unmount?

When using tabs (like Radix UI Tabs), switching tabs unmounts the previous tab's content. Without cleanup, the ref stays `true` even though the form is gone:

```tsx
// IMPORTANT: Reset when component unmounts
useEffect(() => {
  return () => {
    onFormActiveChange?.(false);
  };
}, [onFormActiveChange]);
```

### Handling Nested Popovers

When your form contains popovers (like date pickers), you need to check if the Escape originated from within a popover:

```tsx
const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    // Don't handle if inside a popover (let the popover close first)
    const target = e.target as HTMLElement;
    const isInPopover = target.closest('[data-radix-popper-content-wrapper]');
    if (!isInPopover) {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
  }
}, [handleCancel]);
```

## Usage with GoalDetailsPopoverView

The `GoalDetailsPopoverView` component accepts an `onEscapeKeyDown` prop that forwards to all its internal `DialogContent` variants:

```tsx
<GoalDetailsPopoverView
  popoverKey={goal._id.toString()}
  trigger={<GoalPopoverTrigger title={goal.title} />}
  onEscapeKeyDown={handleEscapeKeyDown}
>
  <GoalLogTab goalId={goal._id} onFormActiveChange={handleLogFormActiveChange} />
</GoalDetailsPopoverView>
```

## Complete Example

See the implementation in:
- `apps/webapp/src/components/molecules/goal-log/useLogFormEscapeHandler.ts`
- `apps/webapp/src/components/molecules/goal-log/GoalLogTab.tsx`
- `apps/webapp/src/components/molecules/goal-log/GoalLogCreateForm.tsx`
- `apps/webapp/src/components/molecules/goal-details-popover/variants/QuarterlyGoalPopover.tsx`
