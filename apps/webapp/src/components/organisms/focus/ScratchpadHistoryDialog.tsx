'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import { useSessionQuery } from 'convex-helpers/react/sessions';
import { Loader2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[672px] h-[600px] max-w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xs font-bold uppercase tracking-wider">
            Scratchpad History
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0">
          {archivedScratchpads === undefined ? (
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
                        onClick={() => setSelectedId(item._id)}
                        className={`rounded-md px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors ${
                          selectedId === item._id ? 'bg-accent/50' : ''
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
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
