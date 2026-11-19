'use client';

import { featureFlags } from '@workspace/backend/config/featureFlags';
import { LockKeyhole } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { CliAuthorizeFlow } from './CliAuthorizeFlow';
import { CliAuthorizeLoading } from './CliAuthorizeLoading';
import { CliAuthorizeStatusCard } from './CliAuthorizeStatusCard';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuthState } from '@/modules/auth/AuthProvider';
import { buildLoginHref } from '@/modules/auth/returnTo';

/**
 * Public approval page for a CLI login request.
 *
 * Gating order matters: a missing request id shows not-found even when login is disabled, and
 * the session-gated flow is mounted only after the auth state resolves to authenticated so
 * signed-out visitors never call the session queries. No AuthErrorBoundary wraps this page —
 * it would drop the `returnTo` needed to come back here after sign-in.
 */
// fallow-ignore-next-line complexity
export function CliAuthorizePage() {
  const requestId = useSearchParams().get('request');
  const authState = useAuthState();

  if (!requestId) {
    return (
      <Shell>
        <CliAuthorizeStatusCard kind="not-found" />
      </Shell>
    );
  }

  if (featureFlags.disableLogin) {
    return (
      <Shell>
        <CliAuthorizeStatusCard kind="login-disabled" />
      </Shell>
    );
  }

  if (authState === undefined) return <CliAuthorizeLoading />;

  if (authState.state !== 'authenticated') {
    return (
      <Shell>
        <SignedOutCard requestId={requestId} />
      </Shell>
    );
  }

  return (
    <Shell>
      <CliAuthorizeFlow requestId={requestId} />
    </Shell>
  );
}

/** Shared centered page shell; the card owns its own max width. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 sm:p-8">
      {children}
    </main>
  );
}

/**
 * Generic sign-in prompt. The request id is a bearer link, so no machine details are disclosed
 * before the visitor authenticates.
 */
function SignedOutCard({ requestId }: { requestId: string }) {
  const loginHref = buildLoginHref(`/cli/authorize?request=${encodeURIComponent(requestId)}`);

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader className="items-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <LockKeyhole className="size-6 text-primary" aria-hidden="true" />
        </div>
        <CardTitle className="text-xl">Sign in to continue</CardTitle>
        <CardDescription>
          Sign in to review and approve the CLI login request. You&apos;ll come back to this page
          afterwards.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Link
          href={loginHref as Route}
          className={cn(buttonVariants({ variant: 'default' }), 'h-11 w-full sm:h-10')}
        >
          Sign in to continue
        </Link>
        <Link href="/" className={cn(buttonVariants({ variant: 'ghost' }), 'h-11 w-full sm:h-10')}>
          Back to Home
        </Link>
      </CardContent>
    </Card>
  );
}
