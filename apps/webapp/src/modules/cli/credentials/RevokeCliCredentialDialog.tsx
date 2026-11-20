'use client';

import type { CliCredentialView } from '@workspace/backend/convex/cli/auth';
import { Loader2 } from 'lucide-react';
import { useRef, type ReactNode } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RevokeCliCredentialDialogProps {
  /** The credential awaiting confirmation, or `null` when the dialog is closed. */
  credential: CliCredentialView | null;
  revoking: boolean;
  failed: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

const CODE_CLASSES = 'rounded bg-muted px-1 py-0.5 font-mono text-xs';

/** Renders "Machine (environment)" without trusting either CLI string as markup. */
function formatMachineLabel(credential: CliCredentialView | null): string {
  if (!credential) return '';
  if (!credential.environment) return credential.machineName;
  return `${credential.machineName} (${credential.environment})`;
}

function formatConfirmLabel(revoking: boolean, failed: boolean): ReactNode {
  if (revoking) {
    return (
      <>
        <Loader2 className="animate-spin" aria-hidden="true" />
        Revoking…
      </>
    );
  }
  return failed ? 'Try again' : 'Revoke access';
}

/**
 * Confirmation dialog for revoking an active CLI credential.
 *
 * Controlled by the parent: it is open while `credential` is set, and it ignores close
 * requests while `revoking` so the user cannot dismiss or double-submit an in-flight request.
 * The last credential is retained so the description does not blank out during the close
 * animation after the parent clears the target.
 */
export function RevokeCliCredentialDialog({
  credential,
  revoking,
  failed,
  onConfirm,
  onOpenChange,
}: RevokeCliCredentialDialogProps) {
  const lastCredential = useRef<CliCredentialView | null>(null);
  if (credential) lastCredential.current = credential;

  const handleOpenChange = (open: boolean) => {
    if (revoking) return;
    onOpenChange(open);
  };

  return (
    <AlertDialog open={credential !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke CLI access?</AlertDialogTitle>
          <AlertDialogDescription>
            {formatMachineLabel(credential ?? lastCredential.current)} will immediately lose access
            to your goals. Any <code className={CODE_CLASSES}>goals</code> command running there
            will fail until you run <code className={CODE_CLASSES}>goals auth login</code> again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            Couldn&apos;t revoke access. Check your connection and try again.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={revoking} onClick={onConfirm}>
            {formatConfirmLabel(revoking, failed)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
