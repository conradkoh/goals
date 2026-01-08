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

### Step 1: Use the Escape Handler Hook

Import the reusable hook that manages the escape key behavior:

```tsx
// MyDialog.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDialogEscapeHandler } from "@/hooks/useDialogEscapeHandler";

export function MyDialog({ open, onOpenChange }) {
  const { handleEscapeKeyDown, handleNestedActiveChange } =
    useDialogEscapeHandler();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onEscapeKeyDown={handleEscapeKeyDown}>
        <MyForm onActiveChange={handleNestedActiveChange} />
      </DialogContent>
    </Dialog>
  );
}
```

### Step 2: Implement the Child Component

The child component needs to:

1. Track its own "active" state
2. Notify the parent when the state changes
3. Handle its own Escape key behavior
4. **Clean up on unmount** (important for tabbed interfaces)

```tsx
// MyForm.tsx
import { useState, useEffect, useCallback } from "react";

interface MyFormProps {
  onActiveChange?: (isActive: boolean) => void;
}

export function MyForm({ onActiveChange }: MyFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Notify parent when form becomes active/inactive
  useEffect(() => {
    onActiveChange?.(isExpanded);
  }, [isExpanded, onActiveChange]);

  // IMPORTANT: Reset state when component unmounts (e.g., tab switch)
  useEffect(() => {
    return () => {
      onActiveChange?.(false);
    };
  }, [onActiveChange]);

  // Handle Escape key within the form
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
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

## The Hook Implementation

The `useDialogEscapeHandler` hook is located at `apps/webapp/src/hooks/useDialogEscapeHandler.ts`:

```tsx
import { useCallback, useRef } from "react";

export function useDialogEscapeHandler() {
  // Use ref instead of state to avoid re-renders and ensure synchronous access
  const isNestedActiveRef = useRef(false);

  /**
   * Handles escape key - prevents dialog from closing if a nested element is active.
   * Call e.preventDefault() to stop the dialog from closing.
   */
  const handleEscapeKeyDown = useCallback((e: KeyboardEvent) => {
    if (isNestedActiveRef.current) {
      e.preventDefault();
    }
  }, []);

  /**
   * Callback to track when a nested element becomes active/inactive.
   */
  const handleNestedActiveChange = useCallback((isActive: boolean) => {
    isNestedActiveRef.current = isActive;
  }, []);

  return {
    isNestedActiveRef,
    handleEscapeKeyDown,
    handleNestedActiveChange,
  };
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
const handleEscapeKeyDown = useCallback(
  (e: KeyboardEvent) => {
    if (isActive) {
      // This captures the value at callback creation time
      e.preventDefault();
    }
  },
  [isActive]
); // Adding dependency causes new callback on every change
```

### Why Clean Up on Unmount?

When using tabs (like Radix UI Tabs), switching tabs unmounts the previous tab's content. Without cleanup, the ref stays `true` even though the form is gone:

```tsx
// IMPORTANT: Reset when component unmounts
useEffect(() => {
  return () => {
    onActiveChange?.(false);
  };
}, [onActiveChange]);
```

### Handling Nested Popovers

When your form contains popovers (like date pickers), you need to check if the Escape originated from within a popover:

```tsx
const handleKeyDown = useCallback(
  (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      // Don't handle if inside a popover (let the popover close first)
      const target = e.target as HTMLElement;
      const isInPopover = target.closest("[data-radix-popper-content-wrapper]");
      if (!isInPopover) {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
    }
  },
  [handleCancel]
);
```

## Usage with GoalDetailsPopoverView

The `GoalDetailsPopoverView` component accepts an `onEscapeKeyDown` prop that forwards to all its internal `DialogContent` variants:

```tsx
<GoalDetailsPopoverView
  popoverKey={goal._id.toString()}
  trigger={<GoalPopoverTrigger title={goal.title} />}
  onEscapeKeyDown={handleEscapeKeyDown}
>
  <GoalLogTab goalId={goal._id} onFormActiveChange={handleNestedActiveChange} />
</GoalDetailsPopoverView>
```

## Complete Example

See the implementation in:

- `apps/webapp/src/hooks/useDialogEscapeHandler.ts`
- `apps/webapp/src/components/molecules/goal-log/GoalLogTab.tsx`
- `apps/webapp/src/components/molecules/goal-log/GoalLogCreateForm.tsx`
- `apps/webapp/src/components/molecules/goal-details-popover/variants/QuarterlyGoalPopover.tsx`
