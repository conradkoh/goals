import type { ReactNode } from 'react';

import { Checkbox } from '@/components/ui/checkbox';

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
}: GoalHeaderProps) {
  const titleClassName = size === 'large' ? 'font-semibold text-xl' : 'font-semibold text-lg';

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 flex-1">
        <Checkbox
          className="flex-shrink-0"
          checked={isComplete}
          disabled={disableCompletion || !onToggleComplete}
          onCheckedChange={(checked) => onToggleComplete?.(checked === true)}
        />
        <h3 className={`${titleClassName} break-words flex-1 leading-tight`}>{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {statusControls}
        {actionMenu}
      </div>
    </div>
  );
}
