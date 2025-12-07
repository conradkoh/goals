import { api } from '@workspace/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { Check, Copy, Laptop } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import { errorTitles, parseConvexError } from '@/lib/error';
import { useSession } from '@/modules/auth/useSession';

export function SyncPassphrase() {
  const { sessionId } = useSession();
  const [syncCode, setSyncCode] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSyncCode, setPendingSyncCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [hasCopied, setHasCopied] = useState(false);
  const hasCreatedInitialSession = useRef(false);

  const createSyncSession = useMutation(api.sync.createSyncSession);
  const validatePassphrase = useMutation(api.sync.validatePassphrase);
  const currentSyncSession = useQuery(
    api.sync.getCurrentSyncSession,
    sessionId
      ? {
          sessionId,
        }
      : 'skip'
  );

  // Create initial sync session when component mounts or when current session is null/consumed
  useEffect(() => {
    if (!sessionId) return;
    if (!currentSyncSession || currentSyncSession.status === 'consumed') {
      hasCreatedInitialSession.current = true;
      createSyncSession({
        sessionId,
      });
    }
  }, [sessionId, currentSyncSession, createSyncSession]);

  // Reset copy state when passphrase changes
  useEffect(() => {
    setHasCopied(false);
  }, []);

  // Calculate initial time left when sync session changes
  useEffect(() => {
    if (currentSyncSession?.expiresAt) {
      const remaining = Math.max(0, Math.floor((currentSyncSession.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }
  }, [currentSyncSession?.expiresAt]);

  // Update countdown timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up, create new session
          if (sessionId) {
            createSyncSession({
              sessionId,
            });
          }
          return Math.floor(
            currentSyncSession?.durationMs ? currentSyncSession.durationMs / 1000 : 60
          );
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionId, createSyncSession, currentSyncSession?.durationMs]);

  const handleSyncAttempt = (code: string) => {
    setPendingSyncCode(code);
    setShowConfirmDialog(true);
  };

  const handleConfirmSync = async () => {
    try {
      const newSession = await validatePassphrase({
        passphrase: pendingSyncCode,
      });
      if (newSession) {
        // Store the new session ID and reload
        localStorage.setItem('goals-session-id', newSession);
        window.location.reload();
      }
    } catch (error) {
      const errorData = parseConvexError(error);
      toast({
        variant: 'destructive',
        title: errorTitles[errorData.code] || 'Sync Failed',
        description: errorData.message,
      });
    }
    setShowConfirmDialog(false);
  };

  const handleCopy = async () => {
    if (!currentSyncSession?.passphrase) return;

    try {
      await navigator.clipboard.writeText(currentSyncSession.passphrase);
      setHasCopied(true);
    } catch (_err) {
      console.error('Failed to copy to clipboard');
    }
  };

  const handleGenerateNewCode = () => {
    if (!sessionId) return;
    createSyncSession({
      sessionId,
    });
  };

  const isCodeConsumed = currentSyncSession?.status === 'consumed';

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="relative flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
          >
            <Laptop className="mr-2 h-4 w-4" />
            <span>Sync Device</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">Sync Code</h4>
              <p className="text-sm text-muted-foreground">
                Use this code to sync with another device. The code refreshes every minute.
              </p>
            </div>
            <div className="space-y-2">
              {isCodeConsumed ? (
                <div className="bg-yellow-50 p-3 rounded-md space-y-2">
                  <p className="text-sm text-yellow-800">
                    This code has been used by another device.
                  </p>
                  <Button onClick={handleGenerateNewCode} size="sm">
                    Generate New Code
                  </Button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="w-full bg-muted hover:bg-muted/80 p-3 rounded-md text-left relative group transition-colors"
                  >
                    <div className="pr-10 break-words">
                      <code className="text-lg font-mono">
                        {currentSyncSession?.passphrase || ''}
                      </code>
                    </div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {hasCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Time remaining</span>
                      <span>{timeLeft}s</span>
                    </div>
                    <Progress
                      value={
                        (timeLeft /
                          (currentSyncSession?.durationMs
                            ? currentSyncSession.durationMs / 1000
                            : 60)) *
                        100
                      }
                    />
                  </div>
                </>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Sync with Another Device</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter sync code"
                  value={syncCode}
                  onChange={(e) => setSyncCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && syncCode) {
                      handleSyncAttempt(syncCode);
                    }
                  }}
                />
                <Button onClick={() => handleSyncAttempt(syncCode)} disabled={!syncCode}>
                  Sync
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Session Sync</AlertDialogTitle>
            <AlertDialogDescription>
              Warning: Syncing with another device will replace your current session. Any unsaved
              changes or data in your current session will be lost. Are you sure you want to
              continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSync}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
