import { Input } from '@/components/ui/input';
import { Check, Edit2, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { DeleteGoalIconButton } from './DeleteGoalIconButton';

interface EditableGoalTitleProps {
  title: string;
  onSubmit: (newTitle: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export const EditableGoalTitle = ({
  title,
  onSubmit,
  onDelete,
}: EditableGoalTitleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(title);
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSubmit = useCallback(async () => {
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
  }, [editText, title, onSubmit]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditText(title);
  }, [title]);

  const handleMouseDown = useCallback(() => {
    setIsSelecting(false);
  }, []);

  const handleMouseMove = useCallback(() => {
    if (!isSelecting) {
      setIsSelecting(true);
    }
  }, [isSelecting]);

  const handleClick = useCallback(() => {
    // Only start editing if we're not selecting text
    if (!isSelecting) {
      setIsEditing(true);
    }
    setIsSelecting(false);
  }, [isSelecting]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSubmit, handleCancel]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditText(e.target.value);
    },
    []
  );

  const startEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  if (isEditing) {
    return (
      <div className="flex items-center min-w-0 flex-grow">
        <Input
          value={editText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
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
      <span
        className="text-sm truncate flex-grow cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {title}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={startEditing}
          className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-foreground"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <DeleteGoalIconButton onDelete={onDelete} />
      </div>
    </div>
  );
};
