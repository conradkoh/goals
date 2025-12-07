import { ArrowDownToLine } from 'lucide-react';
import { memo, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';

interface PullGoalsButtonProps {
  isPulling: boolean;
  onPullGoals: () => Promise<void>;
  dialog: ReactElement;
  className?: string;
  /**
   * When true, renders only the icon without text label.
   * Useful for compact views like the quarterly view.
   */
  iconOnly?: boolean;
}

/**
 * A button component for pulling incomplete goals forward.
 * Combines pulling from last non-empty week + past days of current week.
 * Styled to match JumpToCurrentButton for consistency.
 */
export const PullGoalsButton = memo(
  ({ isPulling, onPullGoals, dialog, className = '', iconOnly = false }: PullGoalsButtonProps) => {
    return (
      <>
        <Button
          variant="outline"
          size={iconOnly ? 'icon' : 'sm'}
          disabled={isPulling}
          onClick={onPullGoals}
          className={`text-muted-foreground hover:text-foreground ${className}`}
          title="Pull incomplete goals forward"
        >
          {iconOnly ? (
            <ArrowDownToLine className="h-4 w-4" />
          ) : (
            <>
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              {isPulling ? 'Pulling...' : 'Pull Goals'}
            </>
          )}
        </Button>

        {dialog}
      </>
    );
  }
);

PullGoalsButton.displayName = 'PullGoalsButton';
