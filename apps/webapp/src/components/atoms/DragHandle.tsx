'use client';

import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { GripVertical } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

import { isTouchDevice } from '@/lib/device';

export interface DragHandleProps {
  /** Attributes from useDraggable hook */
  attributes: DraggableAttributes;
  /** Listeners from useDraggable hook */
  listeners: SyntheticListenerMap | undefined;
  /** Additional className for styling */
  className?: string;
  /** Whether the handle is disabled */
  disabled?: boolean;
}

/**
 * A drag handle component that shows a grip icon for initiating drag operations.
 * Automatically hidden on touch devices to avoid mobile UX issues.
 */
export const DragHandle = memo(function DragHandle({
  attributes,
  listeners,
  className = '',
  disabled = false,
}: DragHandleProps) {
  const [isTouch, setIsTouch] = useState(false);

  // Check for touch device on mount (client-side only)
  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  // Don't render on touch devices
  if (isTouch) {
    return null;
  }

  return (
    <button
      type="button"
      className={`
        flex-shrink-0 cursor-grab touch-none
        text-muted-foreground/50 hover:text-muted-foreground
        focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        transition-colors duration-150
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
      disabled={disabled}
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
});

DragHandle.displayName = 'DragHandle';
