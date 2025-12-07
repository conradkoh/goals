# State Management Standards

## Overview

This guide outlines the standard patterns for managing state in Goals, with a focus on handling loading states and errors effectively.

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

### Pattern 1: Using the `useQuery` Hook with Loading States

```tsx
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function GoalsList() {
  const goals = useQuery(api.goals.list);

  if (goals === undefined) {
    return <LoadingSpinner />;
  }

  return (
    <ul>
      {goals.map((goal) => (
        <li key={goal._id}>{goal.title}</li>
      ))}
    </ul>
  );
}
```

### Pattern 2: Skeleton Loading States

For a better user experience, use skeleton loaders instead of spinners when appropriate:

```tsx
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Skeleton } from '@/components/ui/skeleton';

export function GoalsList() {
  const goals = useQuery(api.goals.list);

  if (goals === undefined) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <ul>
      {goals.map((goal) => (
        <li key={goal._id}>{goal.title}</li>
      ))}
    </ul>
  );
}
```

## Error Handling

### Pattern 1: Try-Catch with Error States

```tsx
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function CreateGoalForm() {
  const [error, setError] = useState<string | null>(null);
  const createGoal = useMutation(api.goals.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const title = formData.get('title') as string;

      await createGoal({ title });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <input name="title" placeholder="Goal title" />
      <button type="submit">Create Goal</button>
    </form>
  );
}
```

### Pattern 2: Global Error Handling

For application-wide errors, use a context provider:

```tsx
// ErrorContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

type ErrorContextType = {
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
};

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  return (
    <ErrorContext.Provider value={{ error, setError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}
```

## Optimistic Updates

For a better user experience, implement optimistic updates:

```tsx
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function ToggleGoalCompletion({ goalId }: { goalId: string }) {
  const goals = useQuery(api.goals.list);
  const updateGoal = useMutation(api.goals.update);

  const goal = goals?.find((g) => g._id === goalId);
  if (!goal) return null;

  const handleToggle = async () => {
    // Optimistically update the UI
    const optimisticValue = !goal.completed;

    // Update in the database
    await updateGoal({
      id: goalId,
      completed: optimisticValue,
    });
  };

  return (
    <button onClick={handleToggle}>
      {goal.completed ? 'Mark Incomplete' : 'Mark Complete'}
    </button>
  );
}
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
