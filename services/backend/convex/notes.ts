/**
 * Notes backend module.
 *
 * Provides CRUD operations for user notes with rich text content.
 * Notes are stored as HTML (from RichTextEditor/Tiptap).
 *
 * @module notes
 */

import { ConvexError, v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';

import { mutation, query } from './_generated/server';
import { requireLogin } from '../src/usecase/requireLogin';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all notes for the current user.
 * Returns notes sorted by updatedAt (most recent first).
 *
 * @example
 * ```tsx
 * const notes = useQuery(api.notes.getNotes, { sessionId });
 * ```
 */
export const getNotes = query({
  args: { ...SessionIdArg },
  handler: async (ctx, args) => {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);

    const notes = await ctx.db
      .query('notes')
      .withIndex('by_user_updated', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect();

    return notes;
  },
});

/**
 * Get a single note by ID.
 * Validates that the note belongs to the current user.
 *
 * @example
 * ```tsx
 * const note = useQuery(api.notes.getNote, { sessionId, noteId });
 * ```
 */
export const getNote = query({
  args: {
    ...SessionIdArg,
    noteId: v.id('notes'),
  },
  handler: async (ctx, args) => {
    const { sessionId, noteId } = args;
    const user = await requireLogin(ctx, sessionId);

    const note = await ctx.db.get('notes', noteId);

    if (!note) {
      return null;
    }

    // Verify ownership
    if (note.userId !== user._id) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this note',
      });
    }

    return note;
  },
});

/**
 * Search notes by title.
 * Returns notes where title contains the search query (case-insensitive).
 *
 * @example
 * ```tsx
 * const results = useQuery(api.notes.searchNotes, { sessionId, query: "meeting" });
 * ```
 */
export const searchNotes = query({
  args: {
    ...SessionIdArg,
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const { sessionId, query: searchQuery } = args;
    const user = await requireLogin(ctx, sessionId);

    // Get all user notes and filter by title
    // Note: For MVP, we do client-side filtering. For scale, consider full-text search.
    const allNotes = await ctx.db
      .query('notes')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = allNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(lowerQuery) ||
        (note.content && note.content.toLowerCase().includes(lowerQuery))
    );

    // Sort by updatedAt desc
    filtered.sort((a, b) => b.updatedAt - a.updatedAt);

    return filtered;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new note.
 * Returns the ID of the newly created note.
 *
 * @example
 * ```tsx
 * const createNote = useMutation(api.notes.createNote);
 * const noteId = await createNote({ sessionId, title: "My Note" });
 * ```
 */
export const createNote = mutation({
  args: {
    ...SessionIdArg,
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { sessionId, title, content } = args;
    const user = await requireLogin(ctx, sessionId);

    const now = Date.now();
    const noteId = await ctx.db.insert('notes', {
      userId: user._id,
      title: title || 'Untitled Note',
      content: content || '',
      createdAt: now,
      updatedAt: now,
    });

    return noteId;
  },
});

/**
 * Update an existing note.
 * Validates ownership before updating.
 *
 * @example
 * ```tsx
 * const updateNote = useMutation(api.notes.updateNote);
 * await updateNote({ sessionId, noteId, title: "New Title" });
 * ```
 */
export const updateNote = mutation({
  args: {
    ...SessionIdArg,
    noteId: v.id('notes'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { sessionId, noteId, title, content } = args;
    const user = await requireLogin(ctx, sessionId);

    const note = await ctx.db.get('notes', noteId);

    if (!note) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Note not found',
      });
    }

    // Verify ownership
    if (note.userId !== user._id) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this note',
      });
    }

    // Build update object with only provided fields
    const updates: { title?: string; content?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };

    if (title !== undefined) {
      updates.title = title;
    }
    if (content !== undefined) {
      updates.content = content;
    }

    await ctx.db.patch('notes', noteId, updates);

    return noteId;
  },
});

/**
 * Delete a note.
 * Validates ownership before deleting.
 *
 * @example
 * ```tsx
 * const deleteNote = useMutation(api.notes.deleteNote);
 * await deleteNote({ sessionId, noteId });
 * ```
 */
export const deleteNote = mutation({
  args: {
    ...SessionIdArg,
    noteId: v.id('notes'),
  },
  handler: async (ctx, args) => {
    const { sessionId, noteId } = args;
    const user = await requireLogin(ctx, sessionId);

    const note = await ctx.db.get('notes', noteId);

    if (!note) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Note not found',
      });
    }

    // Verify ownership
    if (note.userId !== user._id) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this note',
      });
    }

    await ctx.db.delete('notes', noteId);

    return { success: true };
  },
});
