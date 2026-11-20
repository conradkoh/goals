import { Loader2 } from 'lucide-react';

/** Full-height loading state shared by the route fallback and the auth gate. */
export function CliAuthorizeLoading() {
  return (
    <main
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </main>
  );
}
