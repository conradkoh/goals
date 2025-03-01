# Form Validation Standards

## Overview

This guide outlines the standard patterns for implementing form validation in Goals using Zod, React Hook Form, and shadcn/ui components.

## Schema Definition

Define validation schemas using Zod:

```tsx
import { z } from 'zod';

export const goalSchema = z.object({
  title: z
    .string()
    .min(3, { message: 'Title must be at least 3 characters' })
    .max(100, { message: 'Title must be less than 100 characters' }),
  description: z
    .string()
    .max(500, { message: 'Description must be less than 500 characters' })
    .optional(),
  dueDate: z
    .date()
    .min(new Date(), { message: 'Due date must be in the future' })
    .optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export type GoalFormValues = z.infer<typeof goalSchema>;
```

## Form Implementation

Use React Hook Form with Zod resolver:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { goalSchema, GoalFormValues } from './schemas';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function GoalForm({ onSubmit }) {
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter goal title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter goal description (optional)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Create Goal</Button>
      </form>
    </Form>
  );
}
```

## Real-time Validation

For better user experience, implement real-time validation:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';

export function GoalFormWithRealTimeValidation({ onSubmit }) {
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: '',
      description: '',
    },
    mode: 'onChange', // Enable validation on change
  });

  // Watch for changes to display validation in real-time
  const title = form.watch('title');

  useEffect(() => {
    // Trigger validation when title changes
    if (title.length > 0) {
      form.trigger('title');
    }
  }, [title, form]);

  return <Form {...form}>{/* Form fields as in previous example */}</Form>;
}
```

## Server-Side Validation

Always validate data on the server side as well:

```tsx
// In your Convex mutation
import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { z } from 'zod';

// Define the schema on the server side too
const goalSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  dueDate: z.number().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export const createGoal = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate with Zod
    const validatedData = goalSchema.parse(args);

    // If validation passes, proceed with creating the goal
    const goalId = await ctx.db.insert('goals', validatedData);
    return goalId;
  },
});
```

## Error Handling

Handle validation errors gracefully:

```tsx
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function GoalFormWithErrorHandling() {
  const [serverError, setServerError] = useState<string | null>(null);
  const createGoal = useMutation(api.goals.create);

  const onSubmit = async (data: GoalFormValues) => {
    try {
      setServerError(null);
      await createGoal(data);
      // Handle success
    } catch (error) {
      // Handle server-side validation errors
      setServerError(
        error instanceof Error ? error.message : 'An unknown error occurred'
      );
    }
  };

  return (
    <>
      {serverError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <GoalForm onSubmit={onSubmit} />
    </>
  );
}
```
