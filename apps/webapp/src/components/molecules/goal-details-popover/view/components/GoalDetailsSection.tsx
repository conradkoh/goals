import { GoalDetailsContent } from './GoalDetailsContent';

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
export function GoalDetailsSection({
  title,
  details,
  showSeparator = true,
  onDetailsChange,
  readOnly = false,
}: GoalDetailsSectionProps) {
  if (!details) {
    return null;
  }

  return (
    <>
      {showSeparator && <Separator className="my-2" />}
      <div className="pt-1">
        <GoalDetailsContent
          title={title}
          details={details}
          onDetailsChange={onDetailsChange}
          readOnly={readOnly}
        />
      </div>
    </>
  );
}
