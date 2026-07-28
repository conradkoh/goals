import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { ContactRound } from 'lucide-react';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';

export interface ContactCardProps {
  contact: Doc<'contacts'>;
  onSelect: (contact: Doc<'contacts'>) => void;
}

export function ContactCard({ contact, onSelect }: ContactCardProps) {
  const notesPreview = useMemo(() => {
    if (!contact.notes) return null;
    const trimmed = contact.notes.trim();
    if (!trimmed) return null;
    if (trimmed.length <= 120) return trimmed;
    return `${trimmed.slice(0, 117)}...`;
  }, [contact.notes]);

  return (
    <button
      type="button"
      onClick={() => onSelect(contact)}
      aria-label={`View contact ${contact.name}`}
      className={cn(
        'w-full rounded-lg border bg-card p-4 text-left shadow-sm transition-colors',
        'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <div className="flex items-start gap-3">
        <ContactRound className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium">{contact.name}</p>
          {(contact.organization || contact.email) && (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {[contact.organization, contact.email].filter(Boolean).join(' · ')}
            </p>
          )}
          {notesPreview && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{notesPreview}</p>
          )}
        </div>
      </div>
    </button>
  );
}
