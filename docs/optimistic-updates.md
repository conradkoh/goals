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
  | { type: 'remove'; index: number };

function useOptimisticArray<T>(
  actualValue: T[] | undefined
): [T[] | undefined, (action: OptimisticArrayAction<T>) => () => void];
```

#### 2.2 Temporary Storage

```typescript
// Use refs for temporary storage to avoid unnecessary re-renders
const tempStorage = useRef<OptimisticArrayAction<T>[]>([]);

// Use state to force re-renders when needed
const [actionCount, setActionCount] = useState(0);
```

## Implementation Patterns

### 1. Basic Structure

```typescript
// 1. Create the optimistic hook
const [optimisticValue, doAction] = useOptimisticArray(actualValue);

// 2. Define optimistic operations
const handleCreate = async (data: T) => {
  // Create optimistic version
  const optimisticItem = createOptimisticVersion(data);

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
```

### 2. Handling Complex Data Structures

When dealing with nested data:

```typescript
// 1. Create a map for faster lookups
const dataMap = new Map(
  baseItems.map((item) => [item.id, { ...item, children: [] }])
);

// 2. Distribute child items
allItems.forEach((item) => {
  if (item.parentId) {
    const parent = dataMap.get(item.parentId);
    if (parent) {
      parent.children.push(item);
    }
  }
});

// 3. Convert back to array when needed
const items = Array.from(dataMap.values());
```

## Best Practices

### 1. Temporary IDs

- Use predictable temporary IDs for optimistic items
- Prefix or mark temporary IDs to distinguish them
- Replace with real IDs once server responds

```typescript
const optimisticItem = {
  _id: 'temp_id' as Id<'items'>,
  // ... other fields
};
```

### 2. Error Handling

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

### 3. State Reconciliation

- Keep optimistic updates minimal
- Only include fields needed for UI rendering
- Let server queries refresh full state
- Handle race conditions between optimistic updates

## Type Safety

### 1. Define Clear Types

```typescript
type OptimisticItem<T> = T & {
  isOptimistic: true;
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
  const [actionCount, setActionCount] = useState(0);

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

    return [
      ...actualValue,
      ...tempStorage.current.map(action => {
        switch (action.type) {
          case 'append':
            return { ...action.value, isOptimistic: true };
          case 'remove':
            return { ...actualValue[action.index], isOptimistic: true };
        }
      }),
    ];
  }, [actualValue, actionCount]);

  return [optimisticValue, doAction];
}

// 2. Usage in components
function MyComponent() {
  const [items, doAction] = useOptimisticArray(actualItems);

  const handleCreate = async (data: T) => {
    const removeOptimistic = doAction({
      type: 'append',
      value: createOptimisticVersion(data)
    });

    try {
      await createItem(data);
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
        />
      ))}
    </div>
  );
}
```
