import type { Doc } from '@services/backend/convex/_generated/dataModel';
import { cn } from '@/lib/utils';

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
          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
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
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        domain.color ? '' : 'bg-blue-100 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400',
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
