import { type ForwardedRef, forwardRef, useEffect, useRef, useState } from 'react';

import { CreateInputView } from '@/components/atoms/CreateInput';

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

/**
 * Goal creation input with optional expandable children section.
 * Built on top of CreateInputView with additional editing state management.
 *
 * @deprecated Consider using CreateInputView directly unless you need the children editing section.
 */
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

    const handleEscape = () => {
      setIsEditing(false);
      onEscape?.();
    };

    return (
      <div ref={containerRef} className="relative">
        <CreateInputView
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          onEscape={handleEscape}
          onFocus={() => {
            setIsEditing(true);
            onFocus?.();
          }}
          onBlur={onBlur}
          autoFocus={autoFocus}
          disabled={disabled}
        />
        {isEditing && children && (
          <div className="mt-2 border-t border-border pt-2">{children}</div>
        )}
      </div>
    );
  }
);
