# Optimistic Updates Guide

This guide outlines patterns and best practices for implementing optimistic updates in React applications. Optimistic updates provide immediate feedback to users by updating the UI before server operations complete, then reconciling with the actual server state once available.

## Core Concepts

### 1. Optimistic State Management

The optimistic update pattern involves three key states:

1. **Current State**: The actual data from the server
2. **Optimistic State**: Temporary state that reflects what we expect after the operation
3. **Pending Actions**: A queue of operations that are in progress

### 2. Key Components

#### 2.1 Optimistic Array Hook

```typescript
type OptimisticArrayAction<T> =
  | { type: 'append'; value: T }
  | { type: 'remove'; id: string; idField?: string };

function useOptimisticArray<T>(
  actualValue: T[] | undefined
): [T[] | undefined, (action: OptimisticArrayAction<T>) => () => void];
```

#### 2.2 Identifying Optimistic Items

```typescript
// Utility function to check if an ID is optimistic
export const isOptimisticId = (id: string): boolean => {
  return id.startsWith('optimistic_');
};

// Type for items that can be optimistic
type ItemWithOptimisticStatus = T & {
  isOptimistic?: boolean;
};
```

## Implementation Patterns

### 1. Form Input Handling

When handling form inputs with optimistic updates, it's important to manage the input state carefully:

```typescript
const FormComponent = () => {
  const [inputValue, setInputValue] = useState('');
  const [previousValue, setPreviousValue] = useState(''); // For error recovery
  const { toast } = useToast();

  const handleSubmit = async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    // Store current value for error recovery
    setPreviousValue(trimmedValue);
    // Clear input immediately for better UX
    setInputValue('');

    try {
      // Perform optimistic update
      await optimisticOperation(trimmedValue);
      // Success - input is already cleared
    } catch (error) {
      // Restore previous value on error
      setInputValue(previousValue);
      // Show error feedback
      toast({
        variant: 'destructive',
        title: 'Operation failed',
        description: 'There was an error. Please try again.',
      });
    }
  };

  return (
    <input
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onSubmit={handleSubmit}
    />
  );
};
```

Key patterns:

1. Clear input immediately after submission for responsive UX
2. Store previous value for error recovery
3. Restore previous value if operation fails
4. Provide clear error feedback via toast notifications

### 2. Basic Structure

```typescript
// 1. Create the optimistic hook
const [optimisticValue, doAction] = useOptimisticArray(actualValue);

// 2. Define optimistic operations
const handleCreate = async (data: T) => {
  // Generate optimistic ID
  const tempId = `optimistic_${optimisticCounter.current++}`;

  // Create optimistic version
  const optimisticItem = {
    ...createOptimisticVersion(data),
    _id: tempId,
    isOptimistic: true,
  };

  // Add to optimistic state
  const removeOptimistic = doAction({
    type: 'append',
    value: optimisticItem,
  });

  try {
    // Perform actual operation
    await serverOperation(data);
    // Clean up optimistic state
    removeOptimistic();
  } catch (error) {
    // Revert on error
    removeOptimistic();
    throw error;
  }
};

// 3. Define optimistic removal
const handleDelete = async (id: string) => {
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

### 3. UI Feedback During Optimistic Updates

When an item is in an optimistic state, provide clear visual feedback:

```typescript
const ItemComponent = ({ item }: { item: ItemWithOptimisticStatus }) => {
  return (
    <div className="flex items-center gap-2">
      <span>{item.title}</span>
      <div className="flex items-center gap-1">
        {item.isOptimistic ? (
          // Show spinner during optimistic state
          <Spinner className="h-4 w-4" />
        ) : (
          // Show normal actions when not optimistic
          <>
            <EditButton onClick={handleEdit} />
            <DeleteButton onClick={handleDelete} />
          </>
        )}
      </div>
    </div>
  );
};
```

The Spinner component provides subtle loading feedback:

```typescript
export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-transparent',
        className
      )}
      {...props}
    />
  );
}
```

### 4. Error Handling

Comprehensive error handling for optimistic updates:

```typescript
try {
  // Store state for recovery
  setPreviousState(currentState);

  // Apply optimistic update
  const removeOptimistic = doOptimisticUpdate();

  // Attempt server operation
  await serverOperation();

  // Clean up on success
  removeOptimistic();
} catch (error) {
  // 1. Revert optimistic update
  removeOptimistic();

  // 2. Restore previous state if needed
  restorePreviousState();

  // 3. Show error feedback
  toast({
    variant: 'destructive',
    title: 'Operation failed',
    description: 'There was an error. Please try again.',
  });

  // 4. Log error for debugging
  console.error('Operation failed:', error);

  // 5. Re-throw if needed
  throw error;
}
```

Best practices:

1. Always clean up optimistic state
2. Restore previous UI state when needed
3. Provide clear error feedback
4. Log errors for debugging
5. Consider retry mechanisms

### 5. Handling Complex Data Structures

When dealing with nested data:

```typescript
// 1. Create a map for faster lookups
const dataMap = new Map(
  baseItems.map((item) => [item.id, { ...item, children: [] }])
);

// 2. Add isOptimistic flag based on ID
const itemsWithStatus = items.map((item) => ({
  ...item,
  isOptimistic: isOptimisticId(item._id),
}));

// 3. Distribute child items
itemsWithStatus.forEach((item) => {
  if (item.parentId) {
    const parent = dataMap.get(item.parentId);
    if (parent) {
      parent.children.push(item);
    }
  }
});

// 4. Convert back to array when needed
const items = Array.from(dataMap.values());
```

## Best Practices

### 1. Optimistic ID Generation

Use a consistent prefix for optimistic IDs:

```typescript
const optimisticCounter = useRef(0);
const tempId = `optimistic_${optimisticCounter.current++}`;
```

Benefits:

- Easy to identify optimistic items
- Simple counter is sufficient for temporary IDs
- Clear distinction from server-generated IDs

### 2. UI Considerations

1. Show loading indicators in place of actions (edit/delete buttons)
2. Disable interactions that shouldn't be available during optimistic state
3. Use subtle, non-distracting loading animations
4. Maintain layout stability when switching between optimistic and normal states

### 3. Error Handling

- Always clean up optimistic state in both success and error cases
- Provide clear error feedback to users
- Consider retry mechanisms for failed operations

```typescript
try {
  await operation();
  removeOptimistic();
} catch (error) {
  removeOptimistic();
  handleError(error);
}
```

### 4. State Reconciliation

- Keep optimistic updates minimal
- Only include fields needed for UI rendering
- Let server queries refresh full state
- Handle race conditions between optimistic updates

## Type Safety

### 1. Define Clear Types

```typescript
type OptimisticItem<T> = T & {
  isOptimistic: boolean;
};

type OptimisticArray<T> = (T | OptimisticItem<T>)[];
```

### 2. Type Guards

```typescript
const isOptimistic = <T>(
  item: T | OptimisticItem<T>
): item is OptimisticItem<T> => {
  return 'isOptimistic' in item && item.isOptimistic === true;
};
```

## Performance Considerations

1. Use `useRef` for temporary storage to avoid unnecessary re-renders
2. Only trigger re-renders when optimistic state changes
3. Minimize the size of optimistic data
4. Clean up optimistic state promptly
5. Consider batching multiple optimistic updates

## Example Implementation

```typescript
// 1. Define the hook
export function useOptimisticArray<T>(actualValue: T[] | undefined) {
  const tempStorage = useRef<OptimisticArrayAction<T>[]>([]);
  const [, setActionCount] = useState(0);

  const doAction = useCallback((action: OptimisticArrayAction<T>) => {
    tempStorage.current = [...tempStorage.current, action];
    setActionCount(prev => prev + 1);

    return () => {
      const index = tempStorage.current.indexOf(action);
      if (index !== -1) {
        tempStorage.current.splice(index, 1);
        setActionCount(prev => prev - 1);
      }
    };
  }, []);

  const optimisticValue = useMemo(() => {
    if (!actualValue) return undefined;
    const result = [...actualValue];

    tempStorage.current.forEach(action => {
      switch (action.type) {
        case 'append':
          result.push({ ...action.value, isOptimistic: true });
          break;
        case 'remove': {
          const idField = action.idField || '_id';
          const index = result.findIndex(
            item => item[idField] === action.id
          );
          if (index !== -1) {
            result.splice(index, 1);
          }
          break;
        }
      }
    });

    return result;
  }, [actualValue]);

  return [optimisticValue, doAction];
}

// 2. Usage in components
function MyComponent() {
  const [items, doAction] = useOptimisticArray(actualItems);

  const handleCreate = async (data: T) => {
    const { goalId: tempId } = generateTempIds('section');
    const optimisticItem = createOptimisticVersion(data, tempId);

    const removeOptimistic = doAction({
      type: 'append',
      value: optimisticItem
    });

    try {
      await createItem(data);
      removeOptimistic();
    } catch (error) {
      removeOptimistic();
      handleError(error);
    }
  };

  const handleDelete = async (id: string) => {
    const removeOptimistic = doAction({
      type: 'remove',
      id
    });

    try {
      await deleteItem(id);
      removeOptimistic();
    } catch (error) {
      removeOptimistic();
      handleError(error);
    }
  };

  return (
    <div>
      {items?.map(item => (
        <Item
          key={item.id}
          data={item}
          isOptimistic={'isOptimistic' in item}
          onDelete={() => handleDelete(item.id)}
        />
      ))}
    </div>
  );
}
```
