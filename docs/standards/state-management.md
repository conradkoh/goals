# State Management Guide

## Overview

This guide outlines the standard patterns for managing state in the Goals application, with a focus on handling loading states and errors effectively.

## Implementation Pattern

### 1. Data Structure

```typescript
type MutationState = {
  isLoading: boolean;
  error: Error | null;
};

type QueryState<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
};
```

### 2. Hook Usage

```typescript
const useMutation = <T>(mutationFn: (data: T) => Promise<void>) => {
  const [state, setState] = useState<MutationState>({
    isLoading: false,
    error: null,
  });

  const execute = async (data: T) => {
    setState({ isLoading: true, error: null });
    try {
      await mutationFn(data);
      setState({ isLoading: false, error: null });
    } catch (error) {
      setState({ isLoading: false, error: error as Error });
    }
  };

  return { ...state, execute };
};
```

## Example: Goal Creation

```typescript
const GoalCreation = () => {
  const { isLoading, error, execute } = useMutation(createGoal);

  const handleCreateGoal = async (goal: Goal) => {
    await execute(goal);
  };

  return (
    <div>
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      <GoalForm onSubmit={handleCreateGoal} disabled={isLoading} />
    </div>
  );
};
```

## Loading States

1. Use skeleton loaders for initial data fetch
2. Use inline loading indicators for mutations
3. Disable interactive elements during loading

```typescript
const LoadingState = ({ children, isLoading }) => {
  if (isLoading) {
    return <SkeletonLoader />;
  }
  return children;
};

const LoadingButton = ({ isLoading, children, ...props }) => (
  <button disabled={isLoading} {...props}>
    {isLoading ? <LoadingSpinner /> : children}
  </button>
);
```

## Error Handling

1. Show inline error messages
2. Provide retry functionality
3. Clear errors on new attempts

```typescript
const ErrorState = ({ error, onRetry }) => (
  <div className="error-container">
    <p>{error.message}</p>
    <button onClick={onRetry}>Retry</button>
  </div>
);
```

## TypeScript Utilities

```typescript
type WithLoadingState = {
  isLoading: boolean;
  error: Error | null;
};

type MutationResult<T> = T & WithLoadingState;
```

## Best Practices

1. Always show loading states for operations > 300ms
2. Handle all error cases gracefully
3. Provide clear feedback for all user actions
4. Consider network conditions and timeout handling
5. Use consistent loading and error UI patterns

## Example: Goal Status Update

```typescript
const GoalStatusToggle = ({ goalId, initialStatus }) => {
  const { isLoading, error, execute } = useMutation(updateGoalStatus);

  const handleToggle = async () => {
    await execute({ goalId, status: !initialStatus });
  };

  return (
    <div>
      <LoadingButton isLoading={isLoading} onClick={handleToggle}>
        Toggle Status
      </LoadingButton>
      {error && <ErrorMessage error={error} />}
    </div>
  );
};
```

## Integration with Forms

```typescript
const GoalForm = () => {
  const { isLoading, error, execute } = useMutation(createGoal);
  const form = useForm<Goal>();

  const onSubmit = async (data: Goal) => {
    await execute(data);
  };

  return (
    <Form {...form}>
      <FormField
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input {...field} disabled={isLoading} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <LoadingButton type="submit" isLoading={isLoading}>
        Create Goal
      </LoadingButton>
      {error && <ErrorMessage error={error} />}
    </Form>
  );
};
```
