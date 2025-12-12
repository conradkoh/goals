import { cn } from '@/lib/utils';

type SpinnerProps = React.HTMLAttributes<HTMLDivElement>;

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-muted-foreground/30 border-t-transparent',
        className
      )}
      {...props}
    />
  );
}
