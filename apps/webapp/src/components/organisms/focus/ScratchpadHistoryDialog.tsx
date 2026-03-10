'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import { useSessionQuery } from 'convex-helpers/react/sessions';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCallback, useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SafeHTML } from '@/components/ui/safe-html';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      <div className="space-y-6 pr-4">
        {groupArchivesByDay(archivedScratchpads).map(({ dateLabel, items }) => (
          <div key={dateLabel}>
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-2 pt-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {dateLabel}
              </h3>
            </div>
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleItemClick(item._id)}
                  className={`rounded-md px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors ${
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
    <div className="p-4">
      <div className="text-xs text-muted-foreground mb-4">
        {formatArchiveDateTime(selectedItem.archivedAt)}
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
      <DialogContent className="w-[900px] h-[600px] max-w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xs font-bold uppercase tracking-wider">
            Scratchpad History
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-row">
          {/* List panel — always visible on desktop, conditional on mobile */}
          <div
            className={`md:w-[300px] md:flex-shrink-0 md:border-r md:border-border overflow-y-auto ${
              view === 'detail' ? 'hidden md:block' : 'w-full'
            }`}
          >
            <ScrollArea className="h-full">{listContent}</ScrollArea>
          </div>

          {/* Detail panel — always visible on desktop, conditional on mobile */}
          <div
            className={`flex-1 overflow-y-auto ${view === 'list' ? 'hidden md:block' : 'w-full'}`}
          >
            {/* Mobile back button */}
            <div className="md:hidden p-4 pb-0">
              <button
                onClick={() => setView('list')}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
            </div>
            {detailContent}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
