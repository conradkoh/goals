'use client';

import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo } from 'react';

import { useAuthState } from '@/modules/auth/AuthProvider';
import { LoginWithCode } from '@/modules/auth/LoginWithCode';
import { sanitizeReturnTo } from '@/modules/auth/returnTo';

/**
 * Login code page that allows users to enter a code from another device for authentication.
 * Design: Matches the main login page aesthetic with clean card-based layout.
 */
function LoginCodePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authState = useAuthState();
  const isLoading = authState === undefined;
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));

  // Check if user is authenticated
  const isAuthenticated = useMemo(() => {
    return authState?.state === 'authenticated';
  }, [authState]);

  // Redirect to app (or returnTo) if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push(returnTo ?? '/app');
    }
  }, [isAuthenticated, returnTo, router]);

  if (isLoading) {
    return _renderLoadingState();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Enter Login Code</h1>
          <p className="text-sm text-muted-foreground">
            Use a temporary code from your other device
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <LoginWithCode returnTo={returnTo} />
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href={returnTo ? { pathname: '/login', query: { returnTo } } : '/login'}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to login options
          </Link>
        </div>
      </div>
    </main>
  );
}

/**
 * Login code page with the Suspense boundary required by `useSearchParams`.
 */
export default function LoginCodePage() {
  return (
    <Suspense fallback={_renderLoadingState()}>
      <LoginCodePageContent />
    </Suspense>
  );
}

/**
 * Renders the loading state while checking authentication.
 */
function _renderLoadingState() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </main>
  );
}
