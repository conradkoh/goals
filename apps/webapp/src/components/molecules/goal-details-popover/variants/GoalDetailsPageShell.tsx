'use client';

import { ArrowLeft, Calendar, Home, Loader2, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

function useGoalPageNavigation(dashboardHref: string) {
  const router = useRouter();

  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/app');
    }
  }, [router]);

  const handleGoHome = useCallback(() => {
    router.push('/app');
  }, [router]);

  const handleGoToDashboard = useCallback(() => {
    router.push(dashboardHref);
  }, [router, dashboardHref]);

  return { handleGoBack, handleGoHome, handleGoToDashboard };
}

interface GoalDetailsPageShellProps {
  goalTitle: string;
  hasGoalDetails: boolean;
  contextBadgeLabel: string;
  isLoading: boolean;
  isNotFound: boolean;
  notFoundDescription: string;
  dashboardHref: string;
  children: ReactNode;
}

/**
 * Shared shell for full-page goal detail views (header, loading, not-found).
 */
export function GoalDetailsPageShell({
  goalTitle,
  hasGoalDetails,
  contextBadgeLabel,
  isLoading,
  isNotFound,
  notFoundDescription,
  dashboardHref,
  children,
}: GoalDetailsPageShellProps) {
  const { handleGoBack, handleGoHome, handleGoToDashboard } = useGoalPageNavigation(dashboardHref);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="flex items-center gap-1.5 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div className="flex items-center space-x-2 text-sm text-muted-foreground min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoHome}
                  className="flex items-center gap-1 h-8 px-2 flex-shrink-0"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
                <span className="hidden sm:inline">/</span>
                <span className="hidden sm:inline">Goal</span>
                {hasGoalDetails && (
                  <>
                    <span className="hidden sm:inline">/</span>
                    <span className="font-medium text-foreground truncate max-w-[120px] sm:max-w-xs">
                      {goalTitle}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoToDashboard}
                className="flex items-center gap-1.5 text-xs"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>{contextBadgeLabel}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading goal details...</p>
          </div>
        )}

        {isNotFound && (
          <div className="flex flex-col items-center justify-center py-16">
            <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Goal not found</h2>
            <p className="text-muted-foreground mb-6">{notFoundDescription}</p>
            <Button onClick={handleGoHome}>
              <Home className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
