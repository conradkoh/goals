import { Trash2 } from 'lucide-react';

export interface DeleteIconButtonProps {
  /** Handler for delete action */
  onDelete: () => void;
  /** Additional class names to apply to the button */
  className?: string;
}

/**
 * Delete icon button component.
 * Renders a delete button with consistent styling.
 *
 * @example
 * ```tsx
 * <DeleteIconButton onDelete={handleDelete} />
 * ```
 */
export function DeleteIconButton({ onDelete, className }: DeleteIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onDelete}
      className={
        className ||
        'text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-red-600 dark:hover:text-red-400'
      }
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
