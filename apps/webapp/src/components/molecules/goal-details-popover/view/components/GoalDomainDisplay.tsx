import type { Doc } from '@services/backend/convex/_generated/dataModel';
import { DomainPillView } from '@/components/atoms/DomainPill';

export interface GoalDomainDisplayProps {
  /** The domain to display (optional - if not provided, nothing is rendered) */
  domain?: Doc<'domains'> | null;
}

/**
 * Displays the domain pill for a goal.
 * Only renders if a domain is provided.
 *
 * @example
 * ```tsx
 * <GoalDomainDisplay domain={goal.domain} />
 * ```
 */
export function GoalDomainDisplay({ domain }: GoalDomainDisplayProps) {
  if (!domain) {
    return null;
  }

  return (
    <div className="flex items-center">
      <DomainPillView domainName={domain.name} domainColor={domain.color} interactive={false} />
    </div>
  );
}
