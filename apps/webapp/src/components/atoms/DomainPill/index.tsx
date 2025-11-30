import type { Doc } from '@services/backend/convex/_generated/dataModel';
import { DomainPopover } from '@/components/molecules/DomainPopover';
import { DomainPillView } from './view/DomainPillView';

export type { DomainPillColors } from './lib/colors';
// Re-export utilities and view component for direct access
export { getDomainPillColors } from './lib/colors';
export type { DomainPillViewProps } from './view/DomainPillView';
export { DomainPillView } from './view/DomainPillView';

export interface DomainPillProps {
  /** The domain document, or null/undefined for uncategorized */
  domain?: Doc<'domains'> | null;
  /** Count to display in the pill (e.g., number of goals) */
  count?: number;
  /** Week number for the popover context (for creating new tasks) */
  weekNumber: number;
  /** Whether the pill should be interactive (show popover on click). Defaults to true. */
  interactive?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Domain pill component with integrated popover functionality.
 *
 * By default, clicking the pill opens a popover showing all tasks for that domain
 * and allows creating new tasks. Set `interactive={false}` to render just the visual
 * pill without popover functionality.
 *
 * @example
 * ```tsx
 * // Interactive pill (default) - shows popover on click
 * <DomainPill domain={domain} count={3} weekNumber={48} />
 *
 * // Non-interactive pill - just the visual
 * <DomainPill domain={domain} count={3} weekNumber={48} interactive={false} />
 *
 * // Uncategorized domain
 * <DomainPill domain={null} count={5} weekNumber={48} />
 * ```
 */
export function DomainPill({
  domain,
  count,
  weekNumber,
  interactive = true,
  className,
}: DomainPillProps) {
  const domainName = domain?.name || 'Uncategorized';
  const domainColor = domain?.color;

  const pillView = (
    <DomainPillView
      domainName={domainName}
      domainColor={domainColor}
      count={count}
      interactive={interactive}
      className={className}
    />
  );

  if (!interactive) {
    return pillView;
  }

  return <DomainPopover domain={domain || null} trigger={pillView} weekNumber={weekNumber} />;
}
