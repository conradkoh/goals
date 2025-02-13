import { Input } from '@/components/ui/input';
import { Check, Edit2, X } from 'lucide-react';
import { useState } from 'react';

interface EditableGoalTitleProps {
  title: string;
  onSubmit: (newTitle: string) => Promise<void>;
}

export const EditableGoalTitle = ({
  title,
  onSubmit,
}: EditableGoalTitleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(title);

  const handleSubmit = async () => {
    if (!editText.trim() || editText.trim() === title) {
      setIsEditing(false);
      setEditText(title);
      return;
    }

    try {
      await onSubmit(editText.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update goal title:', error);
      // TODO: Add proper error handling UI
      setEditText(title);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditText(title);
  };

  if (isEditing) {
    return (
      <div className="flex items-center min-w-0 flex-grow">
        <Input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          className="h-7 text-sm bg-transparent"
          autoFocus
        />
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={handleSubmit}
            className="text-muted-foreground hover:text-green-600 transition-colors"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            className="text-muted-foreground hover:text-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 min-w-0 group/title flex-grow">
      <span className="text-sm truncate flex-grow">{title}</span>
      <button
        onClick={() => setIsEditing(true)}
        className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-foreground"
      >
        <Edit2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
