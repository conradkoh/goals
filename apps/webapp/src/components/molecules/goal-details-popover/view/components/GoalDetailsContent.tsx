import { InteractiveHTML } from '@/components/ui/interactive-html';
import { SafeHTML } from '@/components/ui/safe-html';
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
}: GoalDetailsContentProps) {
  const hasInteractiveFeatures = onDetailsChange && !readOnly;

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base break-words flex-1">{title}</h3>
        </div>
      )}

      <div
        className={cn(
          'max-h-[300px] overflow-y-auto rounded-md pt-4 pb-4 px-3 bg-muted/30',
          className
        )}
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
