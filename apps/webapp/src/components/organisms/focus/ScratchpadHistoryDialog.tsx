'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { Check, ChevronLeft, Copy, Loader2, Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useRef, useState } from 'react';

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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SafeHTML } from '@/components/ui/safe-html';
import { ScrollArea } from '@/components/ui/scroll-area';
import { htmlToMarkdown } from '@/lib/html-to-markdown';

// ============================================================================
// Helpers
// ============================================================================

function groupArchivesByDay(
  archives: { _id: string; content?: string; archivedAt: number }[]
): { dateLabel: string; items: typeof archives }[] {
  const groups = new Map<string, typeof archives>();

  for (const archive of archives) {
    const dt = DateTime.fromMillis(archive.archivedAt);
    const dateKey = dt.toFormat('yyyy-MM-dd');

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(archive);
  }

  return Array.from(groups.entries()).map(([, items]) => {
    const dt = DateTime.fromMillis(items[0].archivedAt);
    const today = DateTime.now().startOf('day');
    const archiveDay = dt.startOf('day');
    const diffDays = today.diff(archiveDay, 'days').days;

    let dateLabel: string;
    if (diffDays < 1) {
      dateLabel = 'Today';
    } else if (diffDays < 2) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = dt.toFormat('cccc, MMMM d, yyyy');
    }

    return { dateLabel, items };
  });
}

function formatArchiveTime(timestamp: number): string {
  return DateTime.fromMillis(timestamp).toFormat('h:mm a');
}

function formatArchiveDateTime(timestamp: number): string {
  return DateTime.fromMillis(timestamp).toFormat("cccc, MMMM d, yyyy 'at' h:mm a");
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

// ============================================================================
// ScratchpadHistoryDialog
// ============================================================================

interface ScratchpadHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScratchpadHistoryDialog({ open, onOpenChange }: ScratchpadHistoryDialogProps) {
  const archivedScratchpads = useSessionQuery(
    api.scratchpad.listArchivedScratchpads,
    open ? {} : 'skip'
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setSelectedId(null);
        setView('list');
        setShowDeleteConfirm(false);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  const handleItemClick = useCallback((id: string) => {
    setSelectedId(id);
    setView('detail');
  }, []);

  const selectedItem = Array.isArray(archivedScratchpads)
    ? archivedScratchpads.find((a) => a._id === selectedId)
    : undefined;

  const [copySuccess, setCopySuccess] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setCopySuccess(false);
  }, [selectedId]);

  const handleCopy = useCallback(async () => {
    if (!selectedItem?.content) return;
    const markdown = htmlToMarkdown(selectedItem.content);
    await navigator.clipboard.writeText(markdown);
    setCopySuccess(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopySuccess(false), 2000);
  }, [selectedItem?.content]);

  // ── Delete ────────────────────────────────────────────────────────────
  const deleteArchived = useSessionMutation(api.scratchpad.deleteArchivedScratchpad);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedId) return;
    setShowDeleteConfirm(false);
    try {
      await deleteArchived({ archiveId: selectedId as Id<'scratchpadArchive'> });
      setSelectedId(null);
      setView('list');
    } catch (error) {
      console.error('Failed to delete archived scratchpad:', error);
    }
  }, [selectedId, deleteArchived]);

  // ── List content ──────────────────────────────────────────────────────
  const listContent =
    archivedScratchpads === undefined ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ) : archivedScratchpads.length === 0 ? (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No archived scratchpads yet.
      </div>
    ) : (
      <div className="space-y-4 pr-3 py-2">
        {groupArchivesByDay(archivedScratchpads).map(({ dateLabel, items }) => (
          <div key={dateLabel}>
            <div className="sticky top-0 bg-muted/50 dark:bg-muted/30 backdrop-blur-sm z-10 py-2 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {dateLabel}
              </h3>
            </div>
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleItemClick(item._id)}
                  className={`rounded-md px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors duration-150 ${
                    selectedId === item._id ? 'bg-accent border-l-2 border-primary' : ''
                  }`}
                >
                  <div className="text-[10px] text-muted-foreground">
                    {formatArchiveTime(item.archivedAt)}
                  </div>
                  <p className="text-sm text-foreground line-clamp-2 mt-0.5">
                    {stripHtml(item.content ?? '')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );

  // ── Detail content ────────────────────────────────────────────────────
  const detailContent = selectedItem ? (
    <div key={selectedId} className="pt-1 px-4 pb-4 animate-in fade-in-0 duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-muted-foreground">
          {formatArchiveDateTime(selectedItem.archivedAt)}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className={`text-xs uppercase tracking-wider font-bold ${
              copySuccess ? 'text-emerald-600 dark:text-emerald-400' : ''
            }`}
          >
            {copySuccess ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs uppercase tracking-wider font-bold text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
      </div>
      <SafeHTML html={selectedItem.content ?? ''} className="text-sm" />
    </div>
  ) : (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
      Select an item to view its content
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[900px] h-[600px] max-w-[95vw] sm:max-w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xs font-bold uppercase tracking-wider">
            Scratchpad History
          </DialogTitle>
        </DialogHeader>

        {/* Desktop layout — side-by-side, always visible */}
        <div className="hidden md:flex flex-1 min-h-0 flex-row">
          <div className="w-[240px] flex-shrink-0 border-r border-border overflow-y-auto">
            <ScrollArea className="h-full">{listContent}</ScrollArea>
          </div>
          <div className="flex-1 overflow-y-auto">{detailContent}</div>
        </div>

        {/* Mobile layout — sliding transition between list and detail */}
        <div className="md:hidden flex-1 min-h-0 overflow-hidden">
          <div
            className={`flex h-full transition-transform duration-200 ease-in-out ${
              view === 'detail' ? '-translate-x-full' : 'translate-x-0'
            }`}
          >
            {/* List panel (mobile) */}
            <div className="w-full flex-shrink-0 overflow-y-auto">
              <ScrollArea className="h-full">{listContent}</ScrollArea>
            </div>

            {/* Detail panel (mobile) */}
            <div className="w-full flex-shrink-0 overflow-y-auto">
              <div className="p-4 pb-0">
                <button
                  onClick={() => setView('list')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 mb-3"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              </div>
              {detailContent}
            </div>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Archived Item</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this archived scratchpad. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
