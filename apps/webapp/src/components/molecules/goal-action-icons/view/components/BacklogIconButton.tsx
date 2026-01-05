import { Archive, ArrowUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface BacklogIconButtonProps {
  /** Whether the goal is currently in backlog */
  isBacklog?: boolean;
  /** Handler for toggling backlog status */
  onToggleBacklog?: (isBacklog: boolean) => void;
  /** Additional class names */
  className?: string;
}

/**
 * Icon button for toggling backlog status of adhoc goals.
 * Shows Archive icon to move to backlog, or ArrowUp icon to activate from backlog.
 *
 * @example
 * ```tsx
 * <BacklogIconButton
 *   isBacklog={goal.isBacklog}
 *   onToggleBacklog={handleToggleBacklog}
 * />
 * ```
 */
export function BacklogIconButton({
  isBacklog = false,
  onToggleBacklog,
  className,
}: BacklogIconButtonProps) {
  const handleClick = () => {
    onToggleBacklog?.(!isBacklog);
  };

  const Icon = isBacklog ? ArrowUp : Archive;
  const tooltipText = isBacklog ? 'Move to Active' : 'Move to Backlog';

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 p-0.5 opacity-0 group-hover/goal-item:opacity-100 group-hover/title:opacity-100 transition-opacity',
              isBacklog && 'text-muted-foreground',
              className
            )}
            onClick={handleClick}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
