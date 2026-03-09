'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isHTMLEmpty } from '@/components/ui/rich-text-editor';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Encapsulates all scratchpad state management:
 * - Real-time Convex subscription with local-first editing
 * - Debounced auto-save (500ms)
 * - Race condition handling via timestamp comparison
 * - Archive ("New") with confirmation
 */
export function useScratchpad() {
  const scratchpad = useSessionQuery(api.scratchpad.getScratchpad, {});
  const upsertScratchpad = useSessionMutation(api.scratchpad.upsertScratchpad);
  const archiveScratchpad = useSessionMutation(api.scratchpad.archiveScratchpad);

  const [localContent, setLocalContent] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const lastSavedAtRef = useRef<number>(0);
  const isSavingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cancelPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => cancelPendingSave, [cancelPendingSave]);

  const serverContent = scratchpad?.content ?? '';
  const serverUpdatedAt = scratchpad?.updatedAt ?? 0;
  const hasPendingLocalEdits = localContent !== null;

  if (!hasPendingLocalEdits && !isSavingRef.current && serverUpdatedAt > lastSavedAtRef.current) {
    lastSavedAtRef.current = serverUpdatedAt;
  }

  const content = hasPendingLocalEdits ? localContent : serverContent;
  const isReady = scratchpad !== undefined;

  const save = useCallback(
    async (contentToSave: string) => {
      setSaveStatus('saving');
      isSavingRef.current = true;
      try {
        await upsertScratchpad({ content: contentToSave });
        lastSavedAtRef.current = Date.now();
        isSavingRef.current = false;
        setLocalContent(null);
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
      setLocalContent(newContent);
      cancelPendingSave();
      saveTimeoutRef.current = setTimeout(() => {
        save(newContent);
      }, 500);
    },
    [save, cancelPendingSave]
  );

  const handleNew = useCallback(async () => {
    if (content && !isHTMLEmpty(content)) {
      const confirmed = window.confirm('Archive current content and start fresh?');
      if (!confirmed) return;
    }

    cancelPendingSave();

    try {
      await archiveScratchpad({});
      setLocalContent(null);
      lastSavedAtRef.current = Date.now();
      setSaveStatus('idle');
    } catch (error) {
      console.error('Failed to archive scratchpad:', error);
    }
  }, [content, archiveScratchpad, cancelPendingSave]);

  return {
    content,
    saveStatus,
    isReady,
    handleContentChange,
    handleNew,
  };
}
