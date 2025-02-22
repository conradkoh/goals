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
  // Generate unique temporary IDs
  const tempId = generateTempId('section_name');

  // Create optimistic version with the temp ID
  const optimisticItem = createOptimisticVersion(data, tempId);

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

Generate unique, section-specific temporary IDs to avoid collisions:

```typescript
const generateTempIds = (section: 'weekly' | 'daily') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  return {
    goalId: `temp_${section}_goal_${timestamp}_${randomString}`,
    weeklyId: `temp_${section}_weekly_${timestamp}_${randomString}`,
    userId: `temp_${section}_user_${timestamp}_${randomString}`,
  };
};
```

### 2. ID-Based Removal

Use ID-based removal instead of index-based for more reliable updates:

```typescript
// In the optimistic hook
const optimisticValue = useMemo(() => {
  if (!actualValue) return undefined;
  const result = [...actualValue];

  tempStorage.current.forEach((action) => {
    switch (action.type) {
      case 'append':
        result.push({ ...action.value, isOptimistic: true });
        break;
      case 'remove': {
        const idField = action.idField || '_id';
        const index = result.findIndex((item) => item[idField] === action.id);
        if (index !== -1) {
          result.splice(index, 1);
        }
        break;
      }
    }
  });

  return result;
}, [actualValue]);
```

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
