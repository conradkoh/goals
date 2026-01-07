import { useCallback } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { useGoalContext } from '@/contexts/GoalContext';
import { cn } from '@/lib/utils';

export interface GoalCheckboxProps {
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Callback when completion state changes */
  onToggleComplete?: (isComplete: boolean) => Promise<void>;
  /** Additional class names */
  className?: string;
}

/**
 * Checkbox component for goal completion toggle.
 * Uses goal data from GoalContext.
 *
 * @example
 * ```tsx
 * <GoalProvider goal={goal}>
 *   <GoalCheckbox onToggleComplete={handleToggle} />
 * </GoalProvider>
 * ```
 */
export function GoalCheckbox({ disabled, onToggleComplete, className }: GoalCheckboxProps) {
  const { goal } = useGoalContext();
  const isComplete = goal.isComplete;

  const handleCheckboxChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      if (checked !== 'indeterminate') {
        onToggleComplete?.(checked);
      }
    },
    [onToggleComplete]
  );

  return (
    <Checkbox
      checked={isComplete}
      onCheckedChange={handleCheckboxChange}
      className={cn('flex-shrink-0', className)}
      disabled={disabled}
    />
  );
}
