'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, Check, Loader2, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from '@/modules/auth/useSession';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Note editor page.
 * Provides rich text editing with auto-save functionality.
 */
export default function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { sessionId } = useSession();

  const noteId = params.noteId as Id<'notes'>;

  // Fetch note
  const note = useQuery(api.notes.getNote, {
    sessionId,
    noteId,
  });

  // Mutations
  const updateNote = useMutation(api.notes.updateNote);
  const deleteNote = useMutation(api.notes.deleteNote);

  // Local state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs for debounced save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<{ title: string; content: string } | null>(null);

  // Initialize local state from note
  useEffect(() => {
    if (note && !isInitialized) {
      setTitle(note.title);
      setContent(note.content || '');
      setIsInitialized(true);
    }
  }, [note, isInitialized]);

  // Save function
  const save = useCallback(
    async (titleToSave: string, contentToSave: string) => {
      setSaveStatus('saving');
      try {
        await updateNote({
          sessionId,
          noteId,
          title: titleToSave,
          content: contentToSave,
        });
        setSaveStatus('saved');
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Failed to save note:', error);
        setSaveStatus('error');
      }
    },
    [sessionId, noteId, updateNote]
  );

  // Debounced save
  const debouncedSave = useCallback(
    (newTitle: string, newContent: string) => {
      // Store pending save data
      pendingSaveRef.current = { title: newTitle, content: newContent };

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout
      saveTimeoutRef.current = setTimeout(() => {
        if (pendingSaveRef.current) {
          save(pendingSaveRef.current.title, pendingSaveRef.current.content);
          pendingSaveRef.current = null;
        }
      }, 1500); // 1.5 second debounce
    },
    [save]
  );

  // Handle title change
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      debouncedSave(newTitle, content);
    },
    [content, debouncedSave]
  );

  // Handle content change
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      debouncedSave(title, newContent);
    },
    [title, debouncedSave]
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    try {
      await deleteNote({ sessionId, noteId });
      toast({
        title: 'Note deleted',
        description: 'The note has been permanently deleted.',
      });
      router.push('/app/notes');
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete note.',
        variant: 'destructive',
      });
    }
  }, [sessionId, noteId, deleteNote, router, toast]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    // Save any pending changes before navigating
    if (pendingSaveRef.current) {
      save(pendingSaveRef.current.title, pendingSaveRef.current.content);
    }
    router.push('/app/notes');
  }, [router, save]);

  // Loading state
  if (note === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not found state
  if (note === null) {
    return (
      <div className="container mx-auto max-w-4xl py-6 px-4">
        <div className="text-center py-12">
          <h2 className="text-lg font-medium mb-2">Note not found</h2>
          <p className="text-muted-foreground mb-4">This note may have been deleted.</p>
          <Button onClick={() => router.push('/app/notes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Notes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-4">
          {/* Save status indicator */}
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="h-3 w-3 text-green-600" />
                Saved
              </>
            )}
            {saveStatus === 'error' && <span className="text-destructive">Error saving</span>}
          </span>
          {/* Delete button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Title input */}
      <Input
        value={title}
        onChange={handleTitleChange}
        placeholder="Untitled Note"
        className="text-2xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 mb-4"
      />

      {/* Rich text editor */}
      <div className="min-h-[400px] border rounded-md">
        <RichTextEditor
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing..."
          autoFocus
        />
      </div>
    </div>
  );
}
