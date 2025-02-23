# Optimistic Updates Guide

## Implementation Checklist

✅ **Visual Feedback**

- [ ] Loading state appears on the correct item (not on inputs/buttons)
- [ ] Input fields clear immediately after submission
- [ ] Action buttons/inputs are disabled during operation
- [ ] Previous input values are stored for error recovery

✅ **Error Handling**

- [ ] Failed operations restore previous input values
- [ ] Error toast/notification is shown to user
- [ ] Optimistic state is cleaned up on both success and failure
- [ ] Operation can be retried after failure

✅ **State Management**

- [ ] Optimistic IDs are generated with correct prefix
- [ ] Parent-child relationships are maintained
- [ ] UI updates immediately with optimistic data
- [ ] Server state properly replaces optimistic state

✅ **Edge Cases**

- [ ] Multiple operations can be performed simultaneously
- [ ] Operations can be cancelled if supported
- [ ] UI remains responsive during operations
- [ ] Network disconnection is handled gracefully

This guide outlines patterns and best practices for implementing optimistic updates in our React application, with specific focus on goal management.

## Core Concepts

### 1. Optimistic State Management

The optimistic update pattern involves:

1. **Current State**: The actual data from the server
2. **Optimistic State**: Temporary state that reflects what we expect after the operation
3. **Parent-Child Relationships**: How optimistic updates affect hierarchical data
4. **Visual Feedback**: How to indicate optimistic state to users

### 2. Key Components

#### 2.1 Optimistic Array Hook

```typescript
type OptimisticArrayAction<T> =
  | { type: 'append'; value: T }
  | { type: 'remove'; id: string; idField?: string }
  | { type: 'update'; id: string; value: T; idField?: string };

function useOptimisticArray<T>(
  actualValue: T[] | undefined
): [T[] | undefined, (action: OptimisticArrayAction<T>) => () => void];
```

#### 2.2 Optimistic ID Management

```typescript
// Utility function to check if an ID is optimistic
export const isOptimisticId = (id: string): boolean => {
  return id.startsWith('optimistic_');
};

// Counter for generating unique optimistic IDs
const optimisticCounter = useRef(0);
const tempId = `optimistic_${optimisticCounter.current++}` as Id<'goals'>;
```

## Implementation Patterns

### 1. Creating Optimistic Items

```typescript
const createItemOptimistic = async (data: CreateItemData) => {
  // Generate optimistic ID
  const tempId = `optimistic_${optimisticCounter.current++}` as Id<'goals'>;

  // Create optimistic version
  const optimisticItem = {
    _id: tempId,
    _creationTime: Date.now(),
    ...createOptimisticVersion(data),
    isOptimistic: true,
  };

  // Add to optimistic state
  const removeOptimistic = doAction({
    type: 'append',
    value: optimisticItem,
  });

  try {
    // Perform actual creation
    await serverOperation(data);
    removeOptimistic();
  } catch (error) {
    removeOptimistic();
    throw error;
  }
};
```

### 2. Deleting Optimistic Items

```typescript
const deleteItemOptimistic = async (id: string) => {
  const removeOptimistic = doAction({
    type: 'remove',
    id,
  });

  try {
    await serverOperation(id);
    removeOptimistic();
  } catch (error) {
    removeOptimistic();
    throw error;
  }
};
```

### 3. Managing Parent-Child Relationships

When dealing with hierarchical data:

```typescript
// 1. Create optimistic arrays for each level
const [optimisticParents] = useOptimisticArray(parents);
const [optimisticChildren] = useOptimisticArray(children);

// 2. Distribute children to parents
const parentsWithChildren = parents.map((parent) => ({
  ...parent,
  children: children.filter((child) => child.parentId === parent._id),
}));
```

### 4. Visual Feedback Patterns

#### 4.1 Loading States on Items

When showing loading states for optimistic operations:

```typescript
const ItemComponent = ({ item }) => {
  const isOptimistic = isOptimisticId(item._id);

  return (
    <div className="flex items-center gap-2">
      <span>{item.title}</span>
      {isOptimistic ? (
        <Spinner className="h-4 w-4" />
      ) : (
        <ActionButtons />
      )}
    </div>
  );
};
```

#### 4.2 Input Management

For handling inputs during optimistic updates:

```typescript
const handleCreate = async () => {
  if (!inputValue.trim()) return;

  try {
    setPreviousValue(inputValue); // Store for error recovery
    setInputValue(''); // Clear immediately for better UX
    setIsCreating(true);

    await createOptimistic(inputValue);
  } catch (error) {
    setInputValue(previousValue); // Restore on error
    showErrorToast();
  } finally {
    setIsCreating(false);
  }
};
```

## Best Practices

### 1. Optimistic ID Generation

- Use a consistent prefix (`optimistic_`) for easy identification
- Use a counter to ensure uniqueness within the session
- Include the entity type in the ID for debugging

### 2. Error Handling

- Always clean up optimistic state in both success and error cases
- Provide clear error feedback to users
- Revert optimistic updates on error
- Store previous input values for recovery

### 3. State Distribution

- Keep optimistic updates minimal - only include fields needed for UI
- Handle parent-child relationships carefully
- Let server queries refresh full state

### 4. UI Feedback

- Show loading indicators on the specific items being modified
- Disable relevant inputs during operations
- Maintain interactive elements that don't depend on the operation
- Use optimistic IDs to determine where to show loading states

### 5. Type Safety

```typescript
type OptimisticItem<T> = T & {
  isOptimistic: boolean;
  _id: string;
  _creationTime: number;
};

// Type guard
const isOptimistic = <T>(item: T): item is OptimisticItem<T> => {
  return 'isOptimistic' in item && item.isOptimistic === true;
};
```

## Example: Daily Goals Implementation

See the following files for complete implementation examples:

- `useWeek.tsx`: Context and state management
- `WeekCardDailyGoals.tsx`: UI components
- `DailyGoalItem.tsx`: Item-level optimistic UI
- `useOptimistic.tsx`: Optimistic array hook

Key patterns demonstrated:

1. Optimistic state management with parent-child relationships
2. Loading indicators on individual items
3. Input field management and error recovery
4. Type-safe optimistic ID handling
5. Hierarchical data updates
