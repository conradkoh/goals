import type { Doc } from '@workspace/backend/convex/_generated/dataModel';

import { cn } from '@/lib/utils';

/**
 * V2 Industrial Design System - Domain Badge Component
 *
 * Features:
 * - Sharp corners (no border-radius)
 * - Bold uppercase text with wide tracking
 * - 10px font size
 */
interface DomainBadgeProps {
  domain?: Doc<'domains'> | null;
  className?: string;
  showUncategorized?: boolean;
}

export function DomainBadge({ domain, className, showUncategorized = true }: DomainBadgeProps) {
  if (!domain) {
    if (!showUncategorized) return null;

    return (
      <span
        className={cn(
          'inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
          'bg-muted text-muted-foreground',
          className
        )}
      >
        Uncategorized
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        domain.color ? '' : 'bg-info/10 text-info',
        className
      )}
      style={{
        backgroundColor: domain.color ? `${domain.color}20` : undefined,
        color: domain.color || undefined,
      }}
    >
      {domain.name}
    </span>
  );
}
