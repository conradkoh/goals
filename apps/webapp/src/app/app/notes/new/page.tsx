'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useSession } from '@/modules/auth/useSession';

/**
 * New note page.
 * Creates a new blank note and redirects to the editor.
 */
export default function NewNotePage() {
  const router = useRouter();
  const { sessionId } = useSession();
  const createNote = useMutation(api.notes.createNote);
  const hasCreated = useRef(false);

  useEffect(() => {
    // Prevent double creation in StrictMode
    if (hasCreated.current) return;
    hasCreated.current = true;

    const create = async () => {
      try {
        const noteId = await createNote({ sessionId });
        router.replace(`/app/notes/${noteId}`);
      } catch (error) {
        console.error('Failed to create note:', error);
        router.replace('/app/notes');
      }
    };

    create();
  }, [sessionId, createNote, router]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Creating note...</p>
      </div>
    </div>
  );
}
