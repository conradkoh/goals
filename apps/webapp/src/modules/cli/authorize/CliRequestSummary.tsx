import { format, formatDistanceToNow } from 'date-fns';
import { Laptop } from 'lucide-react';

import { CliEnvironmentBadge } from '../CliEnvironmentBadge';

import { cn } from '@/lib/utils';

interface CliRequestSummaryProps {
  machineName: string;
  environment?: string;
  createdAt?: number;
  secondsLeft?: number;
}

/** Formats a remaining-seconds value as `m:ss`, or a dash when the server gave no expiry. */
function formatSecondsLeft(secondsLeft: number | undefined): string {
  if (secondsLeft === undefined) return '—';
  const safe = Math.max(0, secondsLeft);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Read-only summary of the machine and request behind a CLI login attempt.
 *
 * Machine name and environment are CLI-supplied strings rendered as React text nodes only.
 */
export function CliRequestSummary({
  machineName,
  environment,
  createdAt,
  secondsLeft,
}: CliRequestSummaryProps) {
  return (
    <dl className="divide-y rounded-lg border bg-muted/40 text-sm">
      <div className="flex items-start gap-3 p-3">
        <Laptop className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Machine</dt>
          <dd className="break-words text-base font-semibold text-foreground">{machineName}</dd>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <dt className="text-muted-foreground">Environment</dt>
        <dd>
          <CliEnvironmentBadge environment={environment} />
        </dd>
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <dt className="text-muted-foreground">Requested</dt>
        <dd>
          {createdAt === undefined ? (
            '—'
          ) : (
            <time dateTime={new Date(createdAt).toISOString()} title={format(createdAt, 'PPpp')}>
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </time>
          )}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <dt className="text-muted-foreground">Expires in</dt>
        <dd
          className={cn(
            'font-mono tabular-nums',
            secondsLeft !== undefined && secondsLeft < 60 && 'text-destructive'
          )}
        >
          {formatSecondsLeft(secondsLeft)}
        </dd>
      </div>
    </dl>
  );
}
