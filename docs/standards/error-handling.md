# Error Handling Standards

## Error Types and Schemas

All application errors are defined in a central location:

- Backend: `services/backend/errors.ts`
- Frontend: `apps/webapp/src/lib/error.ts`

### Error Schema

We use Zod to validate error structures:

```typescript
// services/backend/errors.ts
import { z } from 'zod';

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
} as const;

export const errorDataSchema = z.object({
  code: z.enum([
    'VALIDATION_ERROR',
    'NOT_FOUND',
    'UNAUTHORIZED',
    'CONFLICT',
    'INTERNAL_ERROR',
    'UNEXPECTED_ERROR',
  ]),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ErrorData = z.infer<typeof errorDataSchema>;
```

## Backend Error Handling (Convex)

### Using ConvexError

When throwing errors from Convex backend functions, always use `ConvexError` with a structured error object that matches the error schema:

```typescript
import { ConvexError } from 'convex/values';
import { ErrorCode } from './errors';

// ❌ Don't throw plain string errors
throw new ConvexError('Something went wrong');

// ✅ Do throw structured errors
throw new ConvexError({
  code: ErrorCode.VALIDATION_ERROR,
  message: 'Cannot delete goal with child goals',
  details: {
    goalId: '123',
    childCount: 5,
  },
});
```

### Error Codes

Common error codes to use:

- `VALIDATION_ERROR` - For input validation failures
- `NOT_FOUND` - When a requested resource doesn't exist
- `UNAUTHORIZED` - When user doesn't have permission
- `CONFLICT` - When operation conflicts with existing state
- `INTERNAL_ERROR` - For unexpected internal errors
- `UNEXPECTED_ERROR` - For unhandled or system errors

Example usage in a mutation:

```typescript
export const deleteGoal = mutation({
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);

    if (!goal) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: 'Goal not found',
      });
    }

    if (goal.userId !== args.userId) {
      throw new ConvexError({
        code: ErrorCode.UNAUTHORIZED,
        message: 'You do not have permission to delete this goal',
      });
    }

    const childGoals = await ctx.db
      .query('goals')
      .filter((q) => q.eq(q.field('parentId'), args.goalId))
      .collect();

    if (childGoals.length > 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Cannot delete goal with child goals',
        details: {
          childCount: childGoals.length,
        },
      });
    }
  },
});
```

## Frontend Error Handling

### Parsing Convex Errors

Use the `parseConvexError` utility to handle errors from Convex mutations. This function validates the error structure and provides type-safe error data:

```typescript
import { parseConvexError, errorTitles } from '@/lib/error';

try {
  await deleteGoal({ goalId });
} catch (error) {
  const errorData = parseConvexError(error);
  showErrorToast(errorData);
}
```

### Displaying Errors in Toast

Use the centralized error titles and types for consistent error display:

```typescript
import { parseConvexError, errorTitles, type ErrorData } from '@/lib/error';

function showErrorToast(error: ErrorData) {
  toast({
    variant: 'destructive',
    title: errorTitles[error.code],
    description: error.message,
  });
}
```

### Example Component Usage

```typescript
const DeleteGoalButton = ({ goalId }: { goalId: Id<'goals'> }) => {
  const { toast } = useToast();
  const deleteGoal = useMutation(api.goal.deleteGoal);

  const handleDelete = async () => {
    try {
      await deleteGoal({ goalId });
    } catch (error) {
      const errorData = parseConvexError(error);
      toast({
        variant: 'destructive',
        title: errorTitles[errorData.code],
        description: errorData.message,
      });
    }
  };

  return <button onClick={handleDelete}>Delete Goal</button>;
};
```

## Best Practices

1. Always use structured errors that match the error schema
2. Import error codes and types from the central error files
3. Use the `parseConvexError` utility to handle Convex errors
4. Use the centralized error titles for consistent UI messages
5. Include relevant details in the error object when helpful
6. Handle errors at the appropriate level - don't catch errors too early
7. Log errors appropriately for debugging
8. Consider i18n requirements when displaying error messages
9. Let the error parsing utility handle unexpected cases
10. Keep error codes and messages user-friendly and actionable
