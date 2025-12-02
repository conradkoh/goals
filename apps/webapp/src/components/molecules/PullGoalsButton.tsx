import { ArrowDownToLine } from 'lucide-react';
import { memo, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';

interface PullGoalsButtonProps {
  isPulling: boolean;
  onPullGoals: () => Promise<void>;
  dialog: ReactElement;
  className?: string;
}

/**
 * A button component for pulling incomplete goals forward.
 * Combines pulling from last non-empty week + past days of current week.
 * Styled to match JumpToCurrentButton for consistency.
 */
export const PullGoalsButton = memo(
  ({ isPulling, onPullGoals, dialog, className = '' }: PullGoalsButtonProps) => {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          disabled={isPulling}
          onClick={onPullGoals}
          className={`text-muted-foreground hover:text-foreground ${className}`}
        >
          <ArrowDownToLine className="h-4 w-4 mr-2" />
          {isPulling ? 'Pulling...' : 'Pull Goals'}
        </Button>

        {dialog}
      </>
    );
  }
);

PullGoalsButton.displayName = 'PullGoalsButton';
