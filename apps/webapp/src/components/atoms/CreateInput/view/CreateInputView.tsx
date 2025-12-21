import { Plus } from 'lucide-react';
import { forwardRef } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface CreateInputViewProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  /** The current value of the input */
  value: string;
  /** Callback when the input value changes */
  onChange: (value: string) => void;
  /** Callback when the user submits (presses Enter) */
  onSubmit: () => void;
  /** Callback when the user presses Escape */
  onEscape?: () => void;
  /** Icon to display on the left side of the input (defaults to Plus) */
  icon?: React.ReactNode;
  /** Additional class names for the input */
  className?: string;
}

/**
 * Base view component for create inputs.
 * Provides a consistent styled input with icon and keyboard shortcuts.
 *
 * Matches the exact styling of the original CreateGoalInput, with h-9 instead of h-7
 * for better mobile touch targets.
 *
 * @example
 * ```tsx
 * <CreateInputView
 *   placeholder="Add a new item..."
 *   value={value}
 *   onChange={setValue}
 *   onSubmit={handleSubmit}
 * />
 * ```
 */
export const CreateInputView = forwardRef<HTMLInputElement, CreateInputViewProps>(
  (
    {
      placeholder = 'Add a new item...',
      value,
      onChange,
      onSubmit,
      onEscape,
      icon,
      className,
      onKeyDown,
      ...inputProps
    },
    ref
  ) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit();
      } else if (e.key === 'Escape') {
        onChange('');
        onEscape?.();
        (e.target as HTMLInputElement).blur();
        e.preventDefault();
      }

      // Call the original onKeyDown if provided
      onKeyDown?.(e);
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            // Exact match to original CreateGoalInput, only changed h-7 to h-9
            'h-9 text-sm pl-8 bg-transparent border-none hover:bg-accent/50 transition-colors placeholder:text-muted-foreground/60 shadow-none hover:shadow-sm',
            className
          )}
          {...inputProps}
        />
        <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {icon ?? <Plus className="h-3.5 w-3.5 text-muted-foreground/60" />}
        </div>
      </div>
    );
  }
);

CreateInputView.displayName = 'CreateInputView';
