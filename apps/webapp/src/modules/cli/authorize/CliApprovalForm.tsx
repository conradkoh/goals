'use client';

import { AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import type { RefObject } from 'react';

import type { FormError } from './deriveAuthorizeScreen';
import { formatVerificationCode } from './formatVerificationCode';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CliApprovalFormProps {
  code: string;
  onCodeChange: (digits: string) => void;
  busy: 'approve' | 'deny' | null;
  error: FormError | null;
  approverName?: string;
  onApprove: () => void;
  onDeny: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

/**
 * Controlled approval form: the six-digit code lives only in the input value and never in
 * static markup, so the page cannot echo the terminal's code back to the user.
 */
// fallow-ignore-next-line complexity
export function CliApprovalForm({
  code,
  onCodeChange,
  busy,
  error,
  approverName,
  onApprove,
  onDeny,
  inputRef,
}: CliApprovalFormProps) {
  const mismatch = error?.kind === 'mismatch' ? error : null;
  const network = error?.kind === 'network' ? error : null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApprove();
      }}
      className="space-y-4"
      noValidate
    >
      <Alert role="note">
        <ShieldAlert />
        <AlertTitle>Only continue if you started this</AlertTitle>
        <AlertDescription>
          You should have just run{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">goals auth login</code>{' '}
          in your own terminal. If you didn&apos;t, choose Deny.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="cli-verification-code">Verification code from your terminal</Label>
        <Input
          id="cli-verification-code"
          ref={inputRef}
          value={formatVerificationCode(code)}
          onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={7}
          placeholder="000 000"
          disabled={busy !== null}
          aria-invalid={mismatch ? true : undefined}
          aria-describedby={mismatch ? 'cli-code-error' : 'cli-code-hint'}
          className="h-14 text-center font-mono text-2xl tracking-[0.25em] md:text-2xl"
        />
        {mismatch ? (
          <p id="cli-code-error" role="alert" className="text-sm text-destructive">
            That code doesn&apos;t match the one in your terminal.{' '}
            {mismatch.attemptsLeft === 1
              ? 'Last attempt: another wrong code denies this request.'
              : `${mismatch.attemptsLeft} attempts left.`}
          </p>
        ) : (
          <p id="cli-code-hint" className="text-xs text-muted-foreground">
            Enter the 6 digits shown in your terminal. This page never shows the code. Five wrong
            codes deny this request.
          </p>
        )}
      </div>

      {network && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t reach the server</AlertTitle>
          <AlertDescription>
            {network.action === 'approve'
              ? "Your code wasn't submitted. Try again."
              : "The request wasn't denied. Try again."}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full sm:h-10 sm:flex-1"
          disabled={code.length !== 6 || busy !== null}
          aria-busy={busy === 'approve'}
        >
          {busy === 'approve' ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Approving…
            </>
          ) : (
            'Approve access'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 w-full sm:h-10 sm:w-auto"
          onClick={onDeny}
          disabled={busy !== null}
        >
          {busy === 'deny' ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Denying…
            </>
          ) : (
            'Deny'
          )}
        </Button>
      </div>

      {approverName && (
        <p className="text-center text-xs text-muted-foreground">Approving as {approverName}</p>
      )}
    </form>
  );
}
