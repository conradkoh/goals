import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';

export interface GoalHeaderProps {
  /** The goal title */
  title: string;
  /** Whether the goal is complete */
  isComplete: boolean;
  /** Whether completion toggle is disabled */
  disableCompletion?: boolean;
  /** Callback when completion is toggled */
  onToggleComplete?: (isComplete: boolean) => void;
  /** Optional slot for star/pin controls (left of actions) */
  statusControls?: ReactNode;
  /** Optional slot for action menu (right side) */
  actionMenu?: ReactNode;
  /** Title size variant */
  size?: 'default' | 'large';
  /** When set, title is clickable for inline edit; commits via this callback */
  onTitleSave?: (title: string) => void;
}

/**
 * Composable header component for goal details.
 * Renders title with completion checkbox and optional status controls and action menu.
 *
 * @example
 * ```tsx
 * <GoalHeader
 *   title="My Goal"
 *   isComplete={false}
 *   onToggleComplete={(checked) => handleToggle(checked)}
 *   statusControls={<GoalStarPin ... />}
 *   actionMenu={<GoalActionMenu ... />}
 * />
 * ```
 */
export function GoalHeader({
  title,
  isComplete,
  disableCompletion = false,
  onToggleComplete,
  statusControls,
  actionMenu,
  size = 'default',
  onTitleSave,
}: GoalHeaderProps) {
  const titleClassName = size === 'large' ? 'font-semibold text-xl' : 'font-semibold text-lg';
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCancellingRef = useRef(false);

  useEffect(() => {
    if (!isEditing) setDraft(title);
  }, [title, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = useCallback(() => {
    if (isCancellingRef.current) {
      isCancellingRef.current = false;
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) {
      toast({
        title: 'Error',
        description: 'Goal title cannot be empty',
        variant: 'destructive',
      });
      return;
    }
    if (trimmed !== title) onTitleSave?.(trimmed);
    setIsEditing(false);
  }, [draft, title, onTitleSave]);

  const cancel = useCallback(() => {
    isCancellingRef.current = true;
    setDraft(title);
    setIsEditing(false);
  }, [title]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    },
    [commit, cancel]
  );

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 flex-1">
        <Checkbox
          className="flex-shrink-0"
          checked={isComplete}
          disabled={disableCompletion || !onToggleComplete}
          onCheckedChange={(checked) => onToggleComplete?.(checked === true)}
        />
        {isEditing ? (
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            className={`${titleClassName} h-auto border-0 px-0 py-0 shadow-none focus-visible:ring-0`}
          />
        ) : onTitleSave ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={`${titleClassName} break-words flex-1 leading-tight text-left hover:text-primary transition-colors cursor-pointer`}
          >
            {title}
          </button>
        ) : (
          <h3 className={`${titleClassName} break-words flex-1 leading-tight`}>{title}</h3>
        )}
      </div>
      <div className="flex items-center gap-1">
        {statusControls}
        {actionMenu}
      </div>
    </div>
  );
}
