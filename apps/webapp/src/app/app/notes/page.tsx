'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Loader2, Plus, StickyNote } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { NoteCard } from '@/components/molecules/notes/NoteCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSession } from '@/modules/auth/useSession';

/**
 * Notes list page.
 * Displays all user notes with search functionality.
 */
export default function NotesPage() {
  const router = useRouter();
  const { sessionId } = useSession();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all notes
  const allNotes = useQuery(api.notes.getNotes, { sessionId });

  // Fetch search results (only when searching)
  const searchResults = useQuery(
    api.notes.searchNotes,
    searchQuery.trim() ? { sessionId, query: searchQuery.trim() } : 'skip'
  );

  // Use search results when searching, otherwise use all notes
  const notes = searchQuery.trim() ? searchResults : allNotes;

  const handleNewNote = useCallback(() => {
    router.push('/app/notes/new');
  }, [router]);

  const handleNoteClick = useCallback(
    (noteId: string) => {
      router.push(`/app/notes/${noteId}`);
    },
    [router]
  );

  return (
    <div className="container mx-auto max-w-4xl py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <StickyNote className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Notes</h1>
        </div>
        <Button onClick={handleNewNote}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          type="search"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Notes list */}
      {notes === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <StickyNote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">
            {searchQuery.trim() ? 'No notes found' : 'No notes yet'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {searchQuery.trim()
              ? 'Try a different search term.'
              : 'Create your first note to get started.'}
          </p>
          {!searchQuery.trim() && (
            <Button onClick={handleNewNote}>
              <Plus className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {notes.map((note) => (
            <NoteCard key={note._id} note={note} onClick={() => handleNoteClick(note._id)} />
          ))}
        </div>
      )}
    </div>
  );
}
