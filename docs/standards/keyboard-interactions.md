# Keyboard Interactions Guide

## Overview

This guide outlines the standard patterns for implementing keyboard interactions in the Goals application. The focus is on creating a consistent and efficient keyboard-driven experience.

## Key Mappings

### Global Navigation

- `Cmd/Ctrl + K`: Open command palette
- `Cmd/Ctrl + [1-4]`: Switch between weeks
- `Cmd/Ctrl + /`: Show keyboard shortcuts help

### Goal Management

- `Enter`: Create new goal / Save current edit
- `Shift + Enter`: Create new goal without closing current
- `Esc`: Cancel current edit
- `Tab`: Navigate between goals
- `Shift + Tab`: Navigate backwards
- `Space`: Toggle goal completion
- `Delete/Backspace`: Delete goal (with confirmation)

### Section Navigation

- `Alt + Q`: Focus Quarterly Goals
- `Alt + W`: Focus Weekly Goals
- `Alt + D`: Focus Daily Goals

## Focus Management

### Implementation Pattern

```typescript
type FocusTarget = {
  id: string;
  type: 'goal' | 'section' | 'input';
  section: 'quarterly' | 'weekly' | 'daily';
};

const useFocusManagement = () => {
  const [focusedElement, setFocusedElement] = useState<FocusTarget>();

  const handleKeyDown = (event: KeyboardEvent, target: FocusTarget) => {
    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        focusNext(target);
        break;
      case 'Enter':
        event.preventDefault();
        handleEnterKey(target);
        break;
      // ... other key handlers
    }
  };

  return { focusedElement, handleKeyDown };
};
```

## Example: Goal Editing

```typescript
const GoalEditor = () => {
  const { focusedElement, handleKeyDown } = useFocusManagement();

  return (
    <input
      ref={inputRef}
      onKeyDown={(e) =>
        handleKeyDown(e, {
          id: 'goal-1',
          type: 'input',
          section: 'daily',
        })
      }
      autoFocus={focusedElement?.id === 'goal-1'}
    />
  );
};
```

## Focus Order

1. Section headers (Quarterly → Weekly → Daily)
2. Goals within each section (Top to bottom)
3. Interactive elements within goals (Title → Progress → Actions)

```typescript
const FocusOrder = {
  SECTIONS: ['quarterly', 'weekly', 'daily'],
  ELEMENTS: ['title', 'progress', 'actions'],
} as const;
```

## Accessibility Considerations

1. All interactive elements must be focusable
2. Provide visible focus indicators
3. Support both mouse and keyboard interactions
4. Add ARIA labels and roles

```typescript
const AccessibleGoal = () => (
  <div role="listitem" tabIndex={0} aria-label="Goal item">
    {/* Goal content */}
  </div>
);
```

## Best Practices

1. Maintain focus after state updates
2. Provide visual feedback for keyboard actions
3. Support standard keyboard conventions
4. Handle focus trapping in modals
5. Test with screen readers

## Example: Duplicate Goal on Enter

```typescript
const DailyGoalInput = () => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      // Duplicate current goal
      const newGoal = {
        ...currentGoal,
        id: generateId(),
        title: '',
        // Maintain parent relationship
        parentId: currentGoal.parentId,
      };

      createGoal(newGoal).then(() => {
        // Focus new goal automatically
        focusElement({
          id: newGoal.id,
          type: 'input',
          section: 'daily',
        });
      });
    }
  };

  return (
    <input
      onKeyDown={handleKeyDown}
      // ... other props
    />
  );
};
```
