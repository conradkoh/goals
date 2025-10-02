import { Plus } from 'lucide-react';
import { type ForwardedRef, forwardRef, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

interface CreateGoalInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onEscape?: () => void;
  children?: React.ReactNode;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
}

export const CreateGoalInput = forwardRef(
  (
    {
      placeholder = 'Add a goal...',
      value,
      onChange,
      onSubmit,
      onEscape,
      children,
      autoFocus,
      onFocus,
      onBlur,
      disabled,
    }: CreateGoalInputProps,
    ref: ForwardedRef<HTMLInputElement>
  ) => {
    const [isEditing, setIsEditing] = useState(false);
    const internalInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Use the forwarded ref if provided, otherwise use internal ref
    const inputRef = ref || internalInputRef;

    // Handle escape key for the entire component
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          // Check if the active element is within our container
          if (containerRef.current?.contains(document.activeElement)) {
            onChange('');
            setIsEditing(false);
            if (internalInputRef.current) {
              internalInputRef.current.blur();
            }
            onEscape?.(); // Call onEscape if provided
          }
        }
      };

      // Always listen for Escape key, not just when isEditing
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [onChange, onEscape]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onSubmit();
      } else if (e.key === 'Escape') {
        // Also handle Escape directly in the input's keyDown event
        onChange('');
        setIsEditing(false);
        onEscape?.();
        e.preventDefault(); // Prevent the event from bubbling up
      }
    };

    return (
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsEditing(true);
              onFocus?.();
            }}
            onBlur={() => {
              onBlur?.();
            }}
            autoFocus={autoFocus}
            disabled={disabled}
            className="flex w-full rounded-md border border-input px-3 py-1 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-7 text-sm pl-8 bg-transparent border-none hover:bg-gray-50 transition-colors placeholder:text-muted-foreground/60 shadow-none hover:shadow-sm"
          />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <Plus className="h-3.5 w-3.5 text-muted-foreground/60" />
          </div>
        </div>
        {isEditing && children && (
          <div className="mt-2 border-t border-gray-100 pt-2">{children}</div>
        )}
      </div>
    );
  }
);
