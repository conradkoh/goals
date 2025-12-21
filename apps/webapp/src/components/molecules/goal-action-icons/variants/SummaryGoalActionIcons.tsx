import { Edit2, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { EditIconButton } from '../view/components';
import { GoalActionIconsView } from '../view/GoalActionIconsView';

import { Button } from '@/components/ui/button';
import type { GoalSaveHandler } from '@/models/goal-handlers';

export interface SummaryGoalActionIconsProps {
  /** Goal title for edit popover */
  title: string;
  /** Goal details for edit popover */
  details?: string;
  /** Initial due date for edit popover */
  initialDueDate?: number;
  /** Handler for saving goal edits */
  onSave: GoalSaveHandler;
  /** Handler for delete action */
  onDelete: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Goal action icons variant for quarterly summary components.
 * Displays Edit and Delete buttons with Button component styling and always-visible opacity.
 *
 * Used in WeeklyTaskItem, DailySummaryItem, and WeeklySummarySection.
 *
 * @example
 * ```tsx
 * <SummaryGoalActionIcons
 *   title={goal.title}
 *   details={goal.details}
 *   onSave={handleEdit}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export function SummaryGoalActionIcons({
  title,
  details,
  initialDueDate,
  onSave,
  onDelete,
  className,
}: SummaryGoalActionIconsProps) {
  // Custom edit trigger using Button component
  const editTrigger: ReactNode = (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
    >
      <Edit2 className="h-3.5 w-3.5" />
    </Button>
  );

  return (
    <GoalActionIconsView
      className={className || 'opacity-0 group-hover:opacity-100 transition-opacity'}
    >
      <EditIconButton
        title={title}
        details={details}
        initialDueDate={initialDueDate}
        showDomainSelector={false}
        onSave={onSave}
        trigger={editTrigger}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </GoalActionIconsView>
  );
}
