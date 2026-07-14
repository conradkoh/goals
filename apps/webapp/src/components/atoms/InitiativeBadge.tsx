import { cn } from '@/lib/utils';

interface InitiativeBadgeProps {
  title: string;
  className?: string;
}

/** Compact pill showing initiative title on goal rows. */
export function InitiativeBadge({ title, className }: InitiativeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        'bg-primary/10 text-primary',
        className
      )}
      title={title}
    >
      {title}
    </span>
  );
}
