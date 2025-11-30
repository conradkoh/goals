import { forwardRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface GoalDetailsPopoverViewProps {
  /** Unique key for the popover (typically goal ID) */
  popoverKey: string;
  /** The trigger element that opens the popover */
  trigger: ReactNode;
  /** Content to render inside the popover */
  children: ReactNode;
  /** Additional class name for the popover content */
  contentClassName?: string;
  /** Width of the popover (default: 450px) */
  width?: string;
  /** Whether to render as a full-screen dialog instead of a popover */
  fullScreen?: boolean;
  /** Whether the dialog/popover is open (required for fullScreen mode) */
  open?: boolean;
  /** Callback when open state changes (required for fullScreen mode) */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Base view component for goal details.
 * Can render as either a popover (default) or a full-screen dialog.
 *
 * ## Popover Mode (default)
 * ```tsx
 * <GoalDetailsPopoverView
 *   popoverKey={goal._id}
 *   trigger={<GoalPopoverTrigger title={goal.title} />}
 * >
 *   {content}
 * </GoalDetailsPopoverView>
 * ```
 *
 * ## Full-Screen Dialog Mode
 * ```tsx
 * <GoalDetailsPopoverView
 *   popoverKey={goal._id}
 *   trigger={<GoalPopoverTrigger title={goal.title} />}
 *   fullScreen
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 * >
 *   {content}
 * </GoalDetailsPopoverView>
 * ```
 */
export function GoalDetailsPopoverView({
  popoverKey,
  trigger,
  children,
  contentClassName,
  width = '450px',
  fullScreen = false,
  open,
  onOpenChange,
}: GoalDetailsPopoverViewProps) {
  if (fullScreen) {
    return (
      <>
        {/* Trigger for fullscreen mode - clicking it opens the dialog */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: The trigger itself handles keyboard events */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: The trigger contains interactive elements */}
        <span onClick={() => onOpenChange?.(true)}>{trigger}</span>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            className={cn(
              'w-full max-w-[min(48rem,calc(100vw-32px))] max-h-[90vh] overflow-hidden flex flex-col p-6',
              contentClassName
            )}
          >
            <DialogHeader>
              <DialogTitle className="sr-only">Goal Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 overflow-y-auto flex-1">{children}</div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Popover key={`goal-details-${popoverKey}`}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className={cn(`w-[${width}] max-w-[calc(100vw-32px)] p-5`, contentClassName)}
        style={{ width }}
      >
        <div className="space-y-3">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

export interface GoalPopoverTriggerProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  /** Goal title to display */
  title: string;
  /** Button variant */
  variant?: 'default' | 'ghost' | 'outline';
  /** Additional class names for the title text */
  titleClassName?: string;
}

/**
 * Standard trigger button for goal details popover.
 * Renders the goal title as a clickable button.
 * Must forward ref and props for PopoverTrigger asChild to work.
 */
export const GoalPopoverTrigger = forwardRef<HTMLButtonElement, GoalPopoverTriggerProps>(
  (
    {
      title,
      variant = 'ghost',
      className = 'p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full mb-1',
      titleClassName = 'text-gray-600',
      ...props
    },
    ref
  ) => {
    return (
      <Button ref={ref} variant={variant} className={className} {...props}>
        <span className={cn('break-words w-full whitespace-pre-wrap', titleClassName)}>
          {title}
        </span>
      </Button>
    );
  }
);

GoalPopoverTrigger.displayName = 'GoalPopoverTrigger';
