import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * V2 Industrial Design System - Textarea Component
 *
 * Features:
 * - Sharp corners (no border-radius)
 * - 2px border
 * - Bold font weight
 */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-2 border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full bg-transparent px-3 py-2 text-sm font-medium shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
