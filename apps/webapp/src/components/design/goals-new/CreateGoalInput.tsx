import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface CreateGoalInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  children?: React.ReactNode;
}

export const CreateGoalInput = ({
  placeholder = 'Add a goal...',
  value,
  onChange,
  onSubmit,
  children,
}: CreateGoalInputProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle escape key for the entire component
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Check if the active element is within our container
        if (containerRef.current?.contains(document.activeElement)) {
          onChange('');
          setIsEditing(false);
          inputRef.current?.blur();
        }
      }
    };

    if (isEditing) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, onChange]);

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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSubmit();
            }
          }}
          onFocus={() => setIsEditing(true)}
          className="h-7 text-sm text-center bg-transparent border-none hover:bg-gray-50 transition-colors placeholder:text-muted-foreground/60 shadow-none hover:shadow-sm"
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
};
