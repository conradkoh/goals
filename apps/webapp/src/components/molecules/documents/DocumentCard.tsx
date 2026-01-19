import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { FileText } from 'lucide-react';
import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface DocumentCardProps {
  document: Doc<'documents'>;
  onClick?: () => void;
  className?: string;
}

/**
 * Card component for displaying a document preview in lists.
 * Shows title, excerpt, and last updated timestamp.
 */
export function DocumentCard({ document, onClick, className }: DocumentCardProps) {
  // Format the updated timestamp
  const formattedDate = useMemo(() => {
    const date = new Date(document.updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Today - show time
      return `Today at ${date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })}`;
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }, [document.updatedAt]);

  // Extract plain text excerpt from HTML content
  const excerpt = useMemo(() => {
    if (!document.content) return '';

    // Strip HTML tags and get first 150 characters
    const textContent = document.content.replace(/<[^>]*>/g, ' ').trim();
    if (textContent.length <= 150) return textContent;
    return textContent.slice(0, 147) + '...';
  }, [document.content]);

  return (
    <Card
      className={cn('cursor-pointer transition-colors hover:bg-accent/50', className)}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium truncate">{document.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{formattedDate}</p>
          </div>
        </div>
      </CardHeader>
      {excerpt && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2">{excerpt}</p>
        </CardContent>
      )}
    </Card>
  );
}
