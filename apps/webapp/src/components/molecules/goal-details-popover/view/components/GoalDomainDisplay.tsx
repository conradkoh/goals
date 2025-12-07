import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { DomainPill, DomainPillView } from '@/components/atoms/DomainPill';

export interface GoalDomainDisplayProps {
  /** The domain to display (optional - if not provided, nothing is rendered) */
  domain?: Doc<'domains'> | null;
  /** ISO week year for the domain popover context. Required when weekNumber is provided. */
  year?: number;
  /** Week number for the domain popover context. When provided, the pill is interactive. */
  weekNumber?: number;
}

/**
 * Displays the domain pill for a goal.
 * Only renders if a domain is provided.
 *
 * When `weekNumber` is provided, the pill is interactive and clicking it opens
 * a popover showing all tasks for that domain. Without `weekNumber`, the pill
 * is display-only.
 *
 * @example
 * ```tsx
 * // Interactive domain pill (recommended)
 * <GoalDomainDisplay domain={goal.domain} weekNumber={48} />
 *
 * // Non-interactive (display only)
 * <GoalDomainDisplay domain={goal.domain} />
 * ```
 */
export function GoalDomainDisplay({ domain, year, weekNumber }: GoalDomainDisplayProps) {
  if (!domain) {
    return null;
  }

  return (
    <div className="flex items-center">
      {year !== undefined && weekNumber !== undefined ? (
        <DomainPill domain={domain} year={year} weekNumber={weekNumber} />
      ) : (
        <DomainPillView domainName={domain.name} domainColor={domain.color} interactive={false} />
      )}
    </div>
  );
}
