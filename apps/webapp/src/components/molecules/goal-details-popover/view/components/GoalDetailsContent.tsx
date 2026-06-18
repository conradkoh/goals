import { Maximize2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FixedSizeDialog, FixedSizeDialogContent } from '@/components/ui/fixed-size-dialog';
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
  /** Whether to show the full-view expand action above the content */
  showExpandAction?: boolean;
  /** Callback when task list items are checked/unchecked */
  onDetailsChange?: (newDetails: string) => void;
  /** If true, task list checkboxes are disabled */
  readOnly?: boolean;
}

/**
 * Displays goal details content with an expandable full view dialog.
 * Shows HTML content in a scrollable container with an always-visible expand action.
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
  showExpandAction = true,
  onDetailsChange,
  readOnly = false,
}: GoalDetailsContentProps) {
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const hasInteractiveFeatures = onDetailsChange && !readOnly;

  return (
    <>
      <div className="space-y-3">
        {(showTitle || showExpandAction) && (
          <div className="flex items-center justify-between gap-3 border-b-2 border-border px-4 py-3">
            {showTitle ? (
              <h3 className="font-semibold text-base break-words flex-1">{title}</h3>
            ) : (
              <div className="flex-1" />
            )}
            {showExpandAction && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs uppercase tracking-wider font-bold"
                onClick={() => setIsFullViewOpen(true)}
                title="Expand to full view"
                aria-label="Expand goal details"
              >
                <Maximize2 className="h-3.5 w-3.5 mr-1" />
                Expand
              </Button>
            )}
          </div>
        )}

        <div className={cn('overflow-y-auto rounded-md pt-4 pb-4 px-3 bg-muted/30', className)}>
          {hasInteractiveFeatures ? (
            <InteractiveHTML
              html={details}
              className="text-sm prose prose-sm dark:prose-invert max-w-none"
              onContentChange={onDetailsChange}
              readOnly={readOnly}
            />
          ) : (
            <SafeHTML
              html={details}
              className="text-sm prose prose-sm dark:prose-invert max-w-none"
            />
          )}
        </div>
      </div>

      {/* Full view dialog */}
      <Dialog open={isFullViewOpen} onOpenChange={(open) => !open && setIsFullViewOpen(false)}>
        <FixedSizeDialog>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold break-words">{title}</DialogTitle>
          </DialogHeader>
          <FixedSizeDialogContent>
            {hasInteractiveFeatures ? (
              <InteractiveHTML
                html={details}
                className="text-sm prose prose-sm dark:prose-invert max-w-none"
                onContentChange={onDetailsChange}
                readOnly={readOnly}
              />
            ) : (
              <SafeHTML
                html={details}
                className="text-sm prose prose-sm dark:prose-invert max-w-none"
              />
            )}
          </FixedSizeDialogContent>
        </FixedSizeDialog>
      </Dialog>
    </>
  );
}
