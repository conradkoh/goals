'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isHTMLEmpty, type RichTextEditorHandle } from '@/components/ui/rich-text-editor';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Encapsulates all scratchpad state management with optimistic concurrency control:
 * - Real-time Convex subscription for server state
 * - Uncontrolled editor via editorRef (no useEffect sync loops)
 * - Debounced auto-save (500ms) with version tracking
 * - Server-side conflict detection via expectedVersion
 * - Archive ("New") with confirmation
 */
export function useScratchpad() {
  const scratchpad = useSessionQuery(api.scratchpad.getScratchpad, {});
  const upsertScratchpad = useSessionMutation(api.scratchpad.upsertScratchpad);
  const archiveScratchpad = useSessionMutation(api.scratchpad.archiveScratchpad);

  const editorRef = useRef<RichTextEditorHandle | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const lastKnownVersionRef = useRef<number>(0);
  const isSavingRef = useRef(false);
  const pendingContentRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReadyRef = useRef(false);

  const cancelPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => cancelPendingSave, [cancelPendingSave]);

  const serverContent = scratchpad?.content ?? '';
  const serverVersion = scratchpad?.version ?? 0;
  const isReady = scratchpad !== undefined;

  // Apply server content when version advances from an external source
  useEffect(() => {
    if (!isReady) return;

    if (serverVersion > lastKnownVersionRef.current) {
      if (!isSavingRef.current && pendingContentRef.current === null) {
        // No local edits pending and not mid-save — safe to apply server content
        if (isReadyRef.current) {
          editorRef.current?.setContent(serverContent);
        }
      }
      lastKnownVersionRef.current = serverVersion;
    }

    if (!isReadyRef.current) {
      isReadyRef.current = true;
    }
  }, [serverVersion, serverContent, isReady]);

  const save = useCallback(
    async (contentToSave: string) => {
      setSaveStatus('saving');
      isSavingRef.current = true;
      try {
        const result = await upsertScratchpad({
          content: contentToSave,
          expectedVersion: lastKnownVersionRef.current,
        });

        isSavingRef.current = false;

        if (result.conflict) {
          // Server had a newer version — our write was rejected.
          // Accept server state: the subscription will push the latest content.
          pendingContentRef.current = null;
          setSaveStatus('error');
          console.warn(
            'Scratchpad save conflict: server version diverged. Accepting server state.'
          );
          return;
        }

        lastKnownVersionRef.current = result.version;
        pendingContentRef.current = null;
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        isSavingRef.current = false;
        console.error('Failed to save scratchpad:', error);
        setSaveStatus('error');
      }
    },
    [upsertScratchpad]
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      pendingContentRef.current = newContent;
      cancelPendingSave();
      saveTimeoutRef.current = setTimeout(() => {
        save(newContent);
      }, 500);
    },
    [save, cancelPendingSave]
  );

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const handleNewClick = useCallback(() => {
    const currentContent = pendingContentRef.current ?? serverContent;
    if (currentContent && !isHTMLEmpty(currentContent)) {
      setShowArchiveConfirm(true);
      return;
    }

    // Content is empty — archive immediately without confirmation
    cancelPendingSave();
    pendingContentRef.current = null;
    archiveScratchpad({})
      .then(() => {
        editorRef.current?.setContent('');
        setSaveStatus('idle');
      })
      .catch((error: unknown) => {
        console.error('Failed to archive scratchpad:', error);
      });
  }, [serverContent, archiveScratchpad, cancelPendingSave]);

  const handleArchiveConfirm = useCallback(async () => {
    setShowArchiveConfirm(false);
    cancelPendingSave();
    pendingContentRef.current = null;

    try {
      await archiveScratchpad({});
      editorRef.current?.setContent('');
      setSaveStatus('idle');
    } catch (error) {
      console.error('Failed to archive scratchpad:', error);
    }
  }, [archiveScratchpad, cancelPendingSave]);

  return {
    initialContent: serverContent,
    editorRef,
    saveStatus,
    isReady,
    handleContentChange,
    handleNewClick,
    handleArchiveConfirm,
    showArchiveConfirm,
    setShowArchiveConfirm,
  };
}
