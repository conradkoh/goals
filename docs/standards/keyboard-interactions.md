# Keyboard Interaction Standards

## Overview

This guide outlines the standard patterns for implementing keyboard interactions in Goals. The focus is on creating a consistent and efficient keyboard-driven experience.

## Navigation Shortcuts

### Global Navigation

| Shortcut     | Action                       |
| ------------ | ---------------------------- |
| `g` then `q` | Go to Quarterly Goals        |
| `g` then `w` | Go to Weekly Goals           |
| `g` then `d` | Go to Daily Goals            |
| `g` then `s` | Go to Settings               |
| `?`          | Show keyboard shortcuts help |

### Implementation Example

```tsx
import { useHotkeys } from 'react-hotkeys-hook';
import { useRouter } from 'next/navigation';

export function GlobalKeyboardShortcuts() {
  const router = useRouter();

  // Navigation shortcuts
  useHotkeys('g+q', () => router.push('/goals/quarterly'), {
    enableOnFormTags: false,
    splitKey: '+',
  });

  useHotkeys('g+w', () => router.push('/goals/weekly'), {
    enableOnFormTags: false,
    splitKey: '+',
  });

  useHotkeys('g+d', () => router.push('/goals/daily'), {
    enableOnFormTags: false,
    splitKey: '+',
  });

  useHotkeys('g+s', () => router.push('/settings'), {
    enableOnFormTags: false,
    splitKey: '+',
  });

  useHotkeys(
    '?',
    () => {
      // Show keyboard shortcuts help modal
      setShowShortcutsModal(true);
    },
    {
      enableOnFormTags: true,
    }
  );

  return null; // This component doesn't render anything
}
```

## Item Actions

### Goal List Shortcuts

| Shortcut  | Action                            |
| --------- | --------------------------------- |
| `j` / `k` | Move selection down/up            |
| `Enter`   | Open selected goal                |
| `e`       | Edit selected goal                |
| `c`       | Complete/uncomplete selected goal |
| `d`       | Delete selected goal              |
| `n`       | Create new goal                   |

### Implementation Example

```tsx
import { useHotkeys } from 'react-hotkeys-hook';
import { useState } from 'react';

export function GoalsList({ goals }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Navigation within list
  useHotkeys(
    'j',
    () => {
      setSelectedIndex((prev) => Math.min(prev + 1, goals.length - 1));
    },
    {
      enableOnFormTags: false,
    }
  );

  useHotkeys(
    'k',
    () => {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    },
    {
      enableOnFormTags: false,
    }
  );

  // Actions on selected item
  useHotkeys(
    'enter',
    () => {
      const selectedGoal = goals[selectedIndex];
      // Open goal details
      openGoalDetails(selectedGoal.id);
    },
    {
      enableOnFormTags: false,
    }
  );

  useHotkeys(
    'e',
    () => {
      const selectedGoal = goals[selectedIndex];
      // Edit goal
      openEditModal(selectedGoal.id);
    },
    {
      enableOnFormTags: false,
    }
  );

  return (
    <ul>
      {goals.map((goal, index) => (
        <li key={goal.id} className={index === selectedIndex ? 'selected' : ''}>
          {goal.title}
        </li>
      ))}
    </ul>
  );
}
```

## Form Interactions

### Form Shortcuts

| Shortcut     | Action            |
| ------------ | ----------------- |
| `Ctrl+Enter` | Submit form       |
| `Escape`     | Cancel/close form |

### Implementation Example

```tsx
import { useHotkeys } from 'react-hotkeys-hook';

export function GoalForm({ onSubmit, onCancel }) {
  useHotkeys(
    'ctrl+enter',
    () => {
      // Submit the form
      onSubmit();
    },
    {
      enableOnFormTags: true,
    }
  );

  useHotkeys(
    'escape',
    () => {
      // Cancel and close the form
      onCancel();
    },
    {
      enableOnFormTags: true,
    }
  );

  return (
    <form onSubmit={onSubmit}>
      {/* Form fields */}
      <div className="form-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit">Save</button>
      </div>
    </form>
  );
}
```

## Accessibility Considerations

1. Always provide visual indicators for keyboard focus
2. Ensure all keyboard shortcuts have visible alternatives
3. Add `aria-keyshortcuts` attributes to elements with shortcuts
4. Provide a way to view all available shortcuts

### Example with Accessibility Features

```tsx
export function AccessibleButton({ shortcut, action, children }) {
  useHotkeys(shortcut, action, {
    enableOnFormTags: false,
  });

  return (
    <button onClick={action} aria-keyshortcuts={shortcut}>
      {children}
      <span className="sr-only">({shortcut})</span>
    </button>
  );
}
```

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
