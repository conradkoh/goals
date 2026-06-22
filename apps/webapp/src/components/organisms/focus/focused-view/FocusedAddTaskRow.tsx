'use client';

import { Plus } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FocusedAddTaskRowProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  className?: string;
}

export function FocusedAddTaskRow({
  value,
  onChange,
  onSubmit,
  disabled = false,
  className,
}: FocusedAddTaskRowProps) {
  return (
    <li className={cn('list-none', className)}>
      <div className="group/goal-item -mx-1 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50 focus-within:bg-accent/50">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="flex size-4 flex-shrink-0 items-center justify-center rounded-full bg-muted transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Add task"
        >
          <Plus className="h-3 w-3 text-muted-foreground" />
        </button>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Add a task..."
          disabled={disabled}
          className="h-6 min-h-0 min-w-0 flex-1 border-0 bg-transparent px-1 py-0 text-sm font-normal shadow-none focus-visible:border-0 focus-visible:ring-0 placeholder:text-muted-foreground/60"
        />
      </div>
    </li>
  );
}
