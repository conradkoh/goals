# Form Validation Guide

## Overview

This guide outlines the standard patterns for implementing form validation in the Goals application using Zod, React Hook Form, and shadcn/ui components.

## Schema Definition

### Base Schema Types

```typescript
import { z } from 'zod';

// Define reusable schema parts
const baseFieldValidation = {
  required_error: 'This field is required',
  invalid_type_error: 'Invalid input type',
};

// Common field schemas
const titleSchema = z
  .string(baseFieldValidation)
  .min(1, 'Title is required')
  .max(100, 'Title must be less than 100 characters')
  .transform((value) => value.trim());

const descriptionSchema = z
  .string()
  .max(500, 'Description must be less than 500 characters')
  .optional()
  .transform((value) => value?.trim() ?? '');

const dateSchema = z.date({
  required_error: 'Date is required',
  invalid_type_error: 'Invalid date format',
});
```

### Goal Schemas

```typescript
// Define the goal schema hierarchy
const GoalBaseSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  dueDate: dateSchema,
});

const QuarterlyGoalSchema = GoalBaseSchema.extend({
  type: z.literal('quarterly'),
  quarter: z.number().min(1).max(4),
  year: z.number().min(2000),
});

const WeeklyGoalSchema = GoalBaseSchema.extend({
  type: z.literal('weekly'),
  weekNumber: z.number().min(1).max(53),
  quarterlyGoalId: z.string().uuid(),
});

const DailyGoalSchema = GoalBaseSchema.extend({
  type: z.literal('daily'),
  date: dateSchema,
  weeklyGoalId: z.string().uuid(),
});

// Infer types from schemas
type QuarterlyGoal = z.infer<typeof QuarterlyGoalSchema>;
type WeeklyGoal = z.infer<typeof WeeklyGoalSchema>;
type DailyGoal = z.infer<typeof DailyGoalSchema>;
```

## Form Implementation with shadcn/ui

### Base Form Components

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

// Form container with loading state
interface FormContainerProps<T extends z.ZodType> {
  schema: T;
  onSubmit: (data: z.infer<T>) => Promise<void>;
  children: React.ReactNode;
  defaultValues?: Partial<z.infer<T>>;
  isLoading?: boolean;
}

const FormContainer = <T extends z.ZodType>({
  schema,
  onSubmit,
  children,
  defaultValues,
  isLoading,
}: FormContainerProps<T>) => {
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          'space-y-4',
          isLoading && 'opacity-50 pointer-events-none'
        )}
      >
        {children}
      </form>
    </Form>
  );
};
```

### Custom Field Components

```typescript
// Text Input Field
const InputField = <T extends z.ZodType>({
  form,
  name,
  label,
  placeholder,
  description,
}: {
  form: UseFormReturn<z.infer<T>>;
  name: keyof z.infer<T>;
  label: string;
  placeholder?: string;
  description?: string;
}) => (
  <FormField
    control={form.control}
    name={name as string}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input placeholder={placeholder} {...field} />
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    )}
  />
);

// Date Picker Field
const DatePickerField = <T extends z.ZodType>({
  form,
  name,
  label,
}: {
  form: UseFormReturn<z.infer<T>>;
  name: keyof z.infer<T>;
  label: string;
}) => (
  <FormField
    control={form.control}
    name={name as string}
    render={({ field }) => (
      <FormItem className="flex flex-col">
        <FormLabel>{label}</FormLabel>
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <Button
                variant="outline"
                className={cn(
                  'w-full pl-3 text-left font-normal',
                  !field.value && 'text-muted-foreground'
                )}
              >
                {field.value ? (
                  format(field.value, 'PPP')
                ) : (
                  <span>Pick a date</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={field.value}
              onSelect={field.onChange}
              disabled={(date) =>
                date < new Date() || date < new Date('1900-01-01')
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <FormMessage />
      </FormItem>
    )}
  />
);

// Select Field
const SelectField = <T extends z.ZodType>({
  form,
  name,
  label,
  options,
}: {
  form: UseFormReturn<z.infer<T>>;
  name: keyof z.infer<T>;
  label: string;
  options: { value: string; label: string }[];
}) => (
  <FormField
    control={form.control}
    name={name as string}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);
```

### Goal Form Implementation

```typescript
const QuarterlyGoalForm = () => {
  const { isLoading, execute } = useMutation(createQuarterlyGoal);

  return (
    <FormContainer
      schema={QuarterlyGoalSchema}
      onSubmit={execute}
      isLoading={isLoading}
      defaultValues={{
        type: 'quarterly',
        year: new Date().getFullYear(),
      }}
    >
      {(form) => (
        <>
          <InputField
            form={form}
            name="title"
            label="Goal Title"
            placeholder="Enter your quarterly goal"
          />
          <InputField
            form={form}
            name="description"
            label="Description"
            placeholder="Describe your goal"
          />
          <DatePickerField form={form} name="dueDate" label="Due Date" />
          <SelectField
            form={form}
            name="quarter"
            label="Quarter"
            options={[
              { value: '1', label: 'Q1' },
              { value: '2', label: 'Q2' },
              { value: '3', label: 'Q3' },
              { value: '4', label: 'Q4' },
            ]}
          />
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Goal'
            )}
          </Button>
        </>
      )}
    </FormContainer>
  );
};
```

## Best Practices with shadcn/ui

1. **Component Organization**

   - Keep form components in `@/components/forms` directory
   - Create domain-specific form components (e.g., `GoalForm`, `TaskForm`)
   - Reuse shadcn/ui base components

2. **Styling**

   - Use `cn` utility for conditional classes
   - Follow shadcn/ui dark mode patterns
   - Maintain consistent spacing with `space-y-*` classes

3. **Loading States**

   - Use shadcn/ui's built-in loading states
   - Disable form during submission
   - Show loading spinners in buttons

4. **Error Handling**

   - Use `FormMessage` for field errors
   - Show toast notifications for form-level errors
   - Use `useToast` from shadcn/ui for notifications

5. **Accessibility**
   - Maintain shadcn/ui's built-in accessibility features
   - Use proper ARIA labels
   - Support keyboard navigation

## Example: Advanced Form with Async Validation

```typescript
import { useToast } from '@/components/ui/use-toast';

const GoalFormWithAsyncValidation = () => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof GoalSchema>>({
    resolver: zodResolver(GoalSchema),
  });

  const onSubmit = async (data: z.infer<typeof GoalSchema>) => {
    try {
      await createGoal(data);
      toast({
        title: 'Success',
        description: 'Goal created successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create goal',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Form fields */}
      </form>
    </Form>
  );
};
```
