import { Maximize2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InteractiveHTML } from '@/components/ui/interactive-html';
import { SafeHTML } from '@/components/ui/safe-html';
import { cn } from '@/lib/utils';

/**
 * Props for the GoalDetailsContent component.
 */
export interface GoalDetailsContentProps {
  /** The goal title (displayed in full view dialog header) */
  title: string;
  /** HTML content to display as goal details */
  details: string;
  /** Additional CSS classes for the content container */
  className?: string;
  /** Whether to show the title above the content */
  showTitle?: boolean;
  /** Callback when task list items are checked/unchecked */
  onDetailsChange?: (newDetails: string) => void;
  /** If true, task list checkboxes are disabled */
  readOnly?: boolean;
}

/**
 * Displays goal details content with an expandable full view dialog.
 * Shows HTML content in a scrollable container with an expand button on hover.
 * Supports interactive task lists with checkable items.
 *
 * @example
 * ```tsx
 * <GoalDetailsContent
 *   title="My Goal"
 *   details="<p>Some <strong>HTML</strong> content</p>"
 *   showTitle={false}
 *   onDetailsChange={(newHtml) => saveGoal(newHtml)}
 * />
 * ```
 */
export function GoalDetailsContent({
  title,
  details,
  className,
  showTitle = false,
  onDetailsChange,
  readOnly = false,
}: GoalDetailsContentProps) {
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const hasInteractiveFeatures = onDetailsChange && !readOnly;

  return (
    <>
      <div className="space-y-3">
        {showTitle && (
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base break-words flex-1">{title}</h3>
          </div>
        )}

        <div
          className={cn(
            'max-h-[300px] overflow-y-auto rounded-md pt-4 pb-4 px-3 relative group',
            className
          )}
        >
          {hasInteractiveFeatures ? (
            <InteractiveHTML
              html={details}
              className="text-sm prose prose-sm max-w-none"
              onContentChange={onDetailsChange}
              readOnly={readOnly}
            />
          ) : (
            <SafeHTML html={details} className="text-sm prose prose-sm max-w-none" />
          )}

          {/* Absolutely positioned expand button */}
          <div className="absolute top-0 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
            <_ExpandButton onClick={() => setIsFullViewOpen(true)} />
          </div>
        </div>
      </div>

      {/* Full view dialog */}
      <Dialog open={isFullViewOpen} onOpenChange={(open) => !open && setIsFullViewOpen(false)}>
        <DialogContent className="w-full max-w-[min(48rem,calc(100vw-32px))] max-h-[90vh] overflow-hidden flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold break-words">{title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 overflow-y-auto flex-1 pr-2">
            {hasInteractiveFeatures ? (
              <InteractiveHTML
                html={details}
                className="text-sm prose prose-sm max-w-none"
                onContentChange={onDetailsChange}
                readOnly={readOnly}
              />
            ) : (
              <SafeHTML html={details} className="text-sm prose prose-sm max-w-none" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Internal expand button component for triggering full view dialog.
 */
function _ExpandButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-5 w-5 text-muted-foreground hover:text-foreground flex-shrink-0 rounded-full bg-background/80 backdrop-blur-sm shadow-sm"
      onClick={onClick}
      title="Expand to full view"
    >
      <Maximize2 className="h-3 w-3" />
    </Button>
  );
}
