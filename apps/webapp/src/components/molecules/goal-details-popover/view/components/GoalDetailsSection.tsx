import { Separator } from '@/components/ui/separator';
import { GoalDetailsContent } from './GoalDetailsContent';

export interface GoalDetailsSectionProps {
  /** Goal title (for full view dialog) */
  title: string;
  /** HTML details content */
  details: string;
  /** Whether to show the separator above this section */
  showSeparator?: boolean;
}

/**
 * Composable section for displaying goal details.
 * Wraps GoalDetailsContent with optional separator.
 *
 * @example
 * ```tsx
 * <GoalDetailsSection
 *   title="My Goal"
 *   details="<p>Some HTML content</p>"
 * />
 * ```
 */
export function GoalDetailsSection({
  title,
  details,
  showSeparator = true,
}: GoalDetailsSectionProps) {
  if (!details) {
    return null;
  }

  return (
    <>
      {showSeparator && <Separator className="my-2" />}
      <div className="pt-1">
        <GoalDetailsContent title={title} details={details} />
      </div>
    </>
  );
}
