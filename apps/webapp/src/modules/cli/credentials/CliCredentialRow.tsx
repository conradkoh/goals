import type { CliCredentialView } from '@workspace/backend/convex/cli/auth';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, Terminal } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CliEnvironmentBadge } from '@/modules/cli/CliEnvironmentBadge';

interface CliCredentialRowProps {
  credential: CliCredentialView;
  revoking: boolean;
  onRevoke: (credential: CliCredentialView) => void;
}

/**
 * One authorized CLI machine.
 *
 * `machineName` and `environment` come from the CLI and are untrusted, so they are rendered as
 * plain text only. Expired credentials are dimmed and offer "Remove" (no confirmation) because
 * there is no live access left to lose; active credentials offer "Revoke".
 */
export function CliCredentialRow({ credential, revoking, onRevoke }: CliCredentialRowProps) {
  return (
    <li
      className={cn(
        'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between',
        credential.expired && 'opacity-70',
        revoking && 'opacity-60'
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Terminal className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-words font-medium">{credential.machineName}</span>
            <CliEnvironmentBadge environment={credential.environment} />
            {credential.expired && <Badge variant="outline">Expired</Badge>}
          </div>
          <CliCredentialMeta credential={credential} />
        </div>
      </div>
      <CliCredentialAction credential={credential} revoking={revoking} onRevoke={onRevoke} />
    </li>
  );
}

/** Created, last-used and expiry line for one credential. */
function CliCredentialMeta({ credential }: { credential: CliCredentialView }) {
  const created = new Date(credential.createdAt);
  const expires = new Date(credential.expiresAt);
  const lastUsed =
    credential.lastUsedAt === undefined ? undefined : new Date(credential.lastUsedAt);

  return (
    <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
      <span>
        Created{' '}
        <time dateTime={created.toISOString()} title={format(created, 'PPpp')}>
          {format(created, 'PP')}
        </time>
      </span>
      <span>
        Last used{' '}
        {lastUsed ? (
          <time dateTime={lastUsed.toISOString()} title={format(lastUsed, 'PPpp')}>
            {formatDistanceToNow(lastUsed, { addSuffix: true })}
          </time>
        ) : (
          'never'
        )}
      </span>
      <span>
        {credential.expired ? 'Expired' : 'Expires'}{' '}
        <time dateTime={expires.toISOString()} title={format(expires, 'PPpp')}>
          {format(expires, 'PP')}
        </time>
      </span>
    </p>
  );
}

/** Revoke (active) or Remove (expired) action for one credential. */
function CliCredentialAction({ credential, revoking, onRevoke }: CliCredentialRowProps) {
  const actionLabel = credential.expired ? 'Remove' : 'Revoke';
  const ariaLabel = credential.expired
    ? `Remove ${credential.machineName}`
    : `Revoke access for ${credential.machineName}`;

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full sm:w-auto"
      disabled={revoking}
      aria-label={ariaLabel}
      onClick={() => onRevoke(credential)}
    >
      {revoking ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          Revoking…
        </>
      ) : (
        actionLabel
      )}
    </Button>
  );
}
