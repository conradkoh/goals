import { GoalDetailsContent } from './GoalDetailsContent';

import { isHTMLEmpty } from '@/components/ui/rich-text-editor';
import { Separator } from '@/components/ui/separator';

export interface GoalDetailsSectionProps {
  /** Goal title (for full view dialog) */
  title: string;
  /** HTML details content */
  details: string;
  /** Whether to show the separator above this section */
  showSeparator?: boolean;
  /** Callback when task list items are checked/unchecked */
  onDetailsChange?: (newDetails: string) => void;
  /** If true, task list checkboxes are disabled */
  readOnly?: boolean;
  /** When set, clicking details (or empty state) starts editing */
  onEditClick?: () => void;
}

/**
 * Composable section for displaying goal details.
 * Wraps GoalDetailsContent with optional separator.
 * Supports interactive task lists when onDetailsChange is provided.
 *
 * @example
 * ```tsx
 * <GoalDetailsSection
 *   title="My Goal"
 *   details="<p>Some HTML content</p>"
 *   onDetailsChange={(newHtml) => updateGoal(newHtml)}
 * />
 * ```
 */
// fallow-ignore-next-line complexity
export function GoalDetailsSection({
  title,
  details,
  showSeparator = true,
  onDetailsChange,
  readOnly = false,
  onEditClick,
}: GoalDetailsSectionProps) {
  const hasDetails = !isHTMLEmpty(details);

  if (!hasDetails && !onEditClick) return null;

  return (
    <>
      {showSeparator && <Separator className="my-2" />}
      <div className="pt-1">
        {hasDetails ? (
          <GoalDetailsContent
            title={title}
            details={details}
            onDetailsChange={onDetailsChange}
            readOnly={readOnly}
            onEditClick={onEditClick}
          />
        ) : (
          <button
            type="button"
            onClick={onEditClick}
            className="w-full text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md px-3 py-4 transition-colors cursor-pointer"
          >
            No details — click to add
          </button>
        )}
      </div>
    </>
  );
}
