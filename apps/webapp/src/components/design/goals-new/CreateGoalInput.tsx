import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

interface CreateGoalInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export const CreateGoalInput = ({
  placeholder = 'Add a goal...',
  value,
  onChange,
  onSubmit,
}: CreateGoalInputProps) => {
  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSubmit();
          }
        }}
        className="h-7 text-sm text-center bg-transparent border-none hover:bg-gray-50 transition-colors placeholder:text-muted-foreground/60 shadow-none hover:shadow-sm"
      />
      <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <Plus className="h-3.5 w-3.5 text-muted-foreground/60" />
      </div>
    </div>
  );
};
