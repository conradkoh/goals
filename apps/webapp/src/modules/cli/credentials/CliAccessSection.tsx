'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import type { CliCredentialView, RevokeResult } from '@workspace/backend/convex/cli/auth';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { Terminal } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { CliCredentialRow } from './CliCredentialRow';
import { RevokeCliCredentialDialog } from './RevokeCliCredentialDialog';

import { Skeleton } from '@/components/ui/skeleton';

const CODE_CLASSES = 'rounded bg-muted px-1 py-0.5 font-mono text-xs';

/** Turns a revoke result into the one toast the user should see. */
function reportRevokeResult(credential: CliCredentialView, result: RevokeResult): void {
  if (result.success) {
    toast.success(`Revoked access for ${credential.machineName}`);
    return;
  }
  toast.info('That CLI access was already removed');
}

/**
 * "CLI Access" section of the profile page.
 *
 * Lists the caller's unrevoked CLI credentials (newest first, capped server-side) and lets the
 * user revoke an active one through a confirmation dialog or remove an expired one directly.
 * The list is reactive: a successful revoke removes the row without any local bookkeeping.
 *
 * `machineName` and `environment` are untrusted CLI strings and are rendered as text only.
 */
export function CliAccessSection() {
  const credentials = useSessionQuery(api.cli.auth.listMyCliCredentials, {});
  const revoke = useSessionMutation(api.cli.auth.revokeCliCredential);

  const [pending, setPending] = useState<CliCredentialView | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState(false);

  const closeDialog = useCallback(() => {
    setPending(null);
    setDialogError(false);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeDialog();
    },
    [closeDialog]
  );

  const handleRevoke = useCallback(
    async (credential: CliCredentialView) => {
      if (!credential.expired) {
        setDialogError(false);
        setPending(credential);
        return;
      }

      // Expired credentials have no live access left to lose, so "Remove" skips the dialog.
      if (revokingId === credential.id) return;
      setRevokingId(credential.id);
      try {
        reportRevokeResult(credential, await revoke({ credentialId: credential.id }));
      } catch {
        toast.error(`Couldn't remove ${credential.machineName}. Try again.`);
      } finally {
        setRevokingId(null);
      }
    },
    [revoke, revokingId]
  );

  const handleConfirm = useCallback(async () => {
    if (!pending || revokingId === pending.id) return;

    setDialogError(false);
    setRevokingId(pending.id);
    try {
      reportRevokeResult(pending, await revoke({ credentialId: pending.id }));
      closeDialog();
    } catch {
      setDialogError(true);
    } finally {
      setRevokingId(null);
    }
  }, [pending, revoke, revokingId, closeDialog]);

  return (
    <section id="cli-access" className="mt-6 scroll-mt-20 border-t pt-6">
      <h2 className="mb-2 text-xl font-semibold">CLI Access</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Machines authorized to use the <code className={CODE_CLASSES}>goals</code> command line tool
        with your account. Revoke any machine you no longer use.
      </p>
      <CliAccessContent credentials={credentials} revokingId={revokingId} onRevoke={handleRevoke} />
      <RevokeCliCredentialDialog
        credential={pending}
        revoking={pending !== null && revokingId === pending.id}
        failed={dialogError}
        onConfirm={handleConfirm}
        onOpenChange={handleOpenChange}
      />
    </section>
  );
}

interface CliAccessContentProps {
  credentials: CliCredentialView[] | undefined;
  revokingId: string | null;
  onRevoke: (credential: CliCredentialView) => void;
}

/** Loading, empty, or populated list. */
function CliAccessContent({ credentials, revokingId, onRevoke }: CliAccessContentProps) {
  if (credentials === undefined) return <CliAccessSkeleton />;
  if (credentials.length === 0) return <CliAccessEmpty />;

  return (
    <ul className="divide-y rounded-md border">
      {credentials.map((credential) => (
        <CliCredentialRow
          key={credential.id}
          credential={credential}
          revoking={revokingId === credential.id}
          onRevoke={onRevoke}
        />
      ))}
    </ul>
  );
}

function CliAccessSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading CLI access">
      {[0, 1].map((index) => (
        <Skeleton key={index} className="h-16 w-full rounded-md" />
      ))}
    </div>
  );
}

function CliAccessEmpty() {
  return (
    <div className="flex items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      <Terminal className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-medium text-foreground">No CLI access yet</p>
        <p>
          Run <code className={CODE_CLASSES}>goals auth login</code> in your terminal to authorize
          this machine.
        </p>
      </div>
    </div>
  );
}
