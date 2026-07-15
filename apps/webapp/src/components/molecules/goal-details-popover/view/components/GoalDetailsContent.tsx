import { InteractiveHTML } from '@/components/ui/interactive-html';
import { SafeHTML } from '@/components/ui/safe-html';
import { isInteractiveClickTarget } from '@/lib/dom/isInteractiveClickTarget';
import { cn } from '@/lib/utils';

/**
 * Props for the GoalDetailsContent component.
 */
export interface GoalDetailsContentProps {
  /** The goal title (displayed when showTitle is true) */
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
  /** When set, clicking non-interactive details area starts editing */
  onEditClick?: () => void;
}

/**
 * Displays goal details content in a scrollable container.
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
  onEditClick,
}: GoalDetailsContentProps) {
  const hasInteractiveFeatures = onDetailsChange && !readOnly;

  const handleDetailsClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onEditClick || isInteractiveClickTarget(e.target)) return;
    onEditClick();
  };

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center justify-between gap-3 border-b-2 border-border px-4 py-3">
          <h3 className="font-semibold text-base break-words flex-1">{title}</h3>
        </div>
      )}

      <div
        onClick={onEditClick ? handleDetailsClick : undefined}
        className={cn(
          'min-w-0 overflow-x-hidden overflow-y-auto rounded-md pt-4 pb-4 px-3 bg-muted/30',
          onEditClick && 'cursor-pointer hover:bg-muted/50 transition-colors',
          className
        )}
        role={onEditClick ? 'button' : undefined}
        tabIndex={onEditClick ? 0 : undefined}
        onKeyDown={
          onEditClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onEditClick();
                }
              }
            : undefined
        }
      >
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
  );
}
