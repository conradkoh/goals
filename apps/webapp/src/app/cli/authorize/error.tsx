'use client';

import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buildLoginHref } from '@/modules/auth/returnTo';

/**
 * Route error boundary for a thrown query error (for example a stale session).
 *
 * "Sign in again" re-enters the login flow with this exact approval URL as `returnTo`, so the
 * user returns here instead of the bare app after signing in.
 */
export default function CliAuthorizeError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="size-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>We couldn&apos;t load this approval request.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button className="h-11 w-full sm:h-10" onClick={reset}>
            Try again
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full sm:h-10"
            onClick={() =>
              window.location.assign(
                buildLoginHref(window.location.pathname + window.location.search)
              )
            }
          >
            Sign in again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
