'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import { CLI_MAX_CODE_ATTEMPTS } from '@workspace/backend/modules/cli/constants';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { Terminal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CliApprovalForm } from './CliApprovalForm';
import { CliAuthorizeLoading } from './CliAuthorizeLoading';
import { CliAuthorizeStatusCard } from './CliAuthorizeStatusCard';
import { CliRequestSummary } from './CliRequestSummary';
import { deriveAuthorizeScreen, type FormError, type LocalOutcome } from './deriveAuthorizeScreen';
import { useFailedAttempts } from './useFailedAttempts';
import { useNow } from './useNow';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/modules/auth/AuthProvider';

/**
 * Owns the approval request data and the transient UI state for one CLI login request.
 *
 * Mounted only for authenticated users, so the session-gated query can never run signed out.
 * The verification code exists only in `code` until it is submitted; it is never logged,
 * persisted, or rendered outside the controlled input.
 */
// fallow-ignore-next-line complexity
export function CliAuthorizeFlow({ requestId }: { requestId: string }) {
  const view = useSessionQuery(api.cli.auth.getAuthorizationRequest, { requestId });
  const approve = useSessionMutation(api.cli.auth.approveAuthorizationRequest);
  const deny = useSessionMutation(api.cli.auth.denyAuthorizationRequest);
  const currentUser = useCurrentUser();
  const { recordFailure } = useFailedAttempts(requestId);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'approve' | 'deny' | null>(null);
  const [error, setError] = useState<FormError | null>(null);
  const [outcome, setOutcome] = useState<LocalOutcome | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const now = useNow(view?.status === 'pending');
  const screen = deriveAuthorizeScreen({ view, outcome, now });

  // Focusing is a DOM side effect that must run after the render that re-enables the input;
  // it cannot be done in the mismatch event handler itself.
  useEffect(() => {
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler
    if (screen.kind !== 'ready' || busy !== null) return;
    // `focusTick` is a retrigger token: a mismatch clears the input and bumps it so the
    // (previously disabled) input receives focus again.
    inputRef.current?.focus();
  }, [screen.kind, focusTick, busy]);

  const handleCodeChange = useCallback((digits: string) => {
    setError(null);
    setCode(digits);
  }, []);

  // fallow-ignore-next-line complexity
  const handleApprove = useCallback(async () => {
    if (code.length !== 6 || busy !== null) return;

    setBusy('approve');
    setError(null);
    try {
      const result = await approve({ requestId, userCode: code });
      if (result.success) {
        setOutcome('approved');
      } else if (result.reason === 'code_mismatch') {
        const attempts = recordFailure();
        setError({
          kind: 'mismatch',
          attemptsLeft: Math.max(1, CLI_MAX_CODE_ATTEMPTS - attempts),
        });
        setCode('');
        setFocusTick((tick) => tick + 1);
      } else {
        setOutcome(result.reason);
      }
    } catch {
      // Deliberately swallow the error object: it must never be logged alongside the code.
      setError({ kind: 'network', action: 'approve' });
    } finally {
      setBusy(null);
    }
  }, [approve, busy, code, recordFailure, requestId]);

  const handleDeny = useCallback(async () => {
    if (busy !== null) return;

    setBusy('deny');
    setError(null);
    try {
      const result = await deny({ requestId });
      setOutcome(result.success ? 'denied' : result.reason);
    } catch {
      setError({ kind: 'network', action: 'deny' });
    } finally {
      setBusy(null);
    }
  }, [busy, deny, requestId]);

  if (screen.kind === 'loading') return <CliAuthorizeLoading />;

  if (screen.kind === 'approved') {
    return <CliAuthorizeStatusCard kind="approved" machineName={screen.machineName} />;
  }

  if (screen.kind === 'expired') {
    return <CliAuthorizeStatusCard kind="expired" ttlMinutes={screen.ttlMinutes} />;
  }

  if (screen.kind !== 'ready') {
    return <CliAuthorizeStatusCard kind={screen.kind} />;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Terminal className="size-6 text-primary" aria-hidden="true" />
        </div>
        <CardTitle className="text-xl">Authorize Goals CLI</CardTitle>
        <CardDescription>
          A terminal is asking to access your Goals account. Confirm it&apos;s you by typing the
          code it showed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CliRequestSummary
          machineName={screen.machineName}
          environment={screen.environment}
          createdAt={screen.createdAt}
          secondsLeft={
            screen.expiresAt === undefined
              ? undefined
              : Math.max(0, Math.floor((screen.expiresAt - now) / 1000))
          }
        />
        <CliApprovalForm
          code={code}
          onCodeChange={handleCodeChange}
          busy={busy}
          error={error}
          approverName={currentUser?.name}
          onApprove={handleApprove}
          onDeny={handleDeny}
          inputRef={inputRef}
        />
      </CardContent>
    </Card>
  );
}
