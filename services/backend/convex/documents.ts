/**
 * Documents backend module.
 *
 * Provides CRUD operations for user documents with rich text content.
 * Documents are stored as HTML (from RichTextEditor/Tiptap).
 *
 * @module documents
 */

import { ConvexError, v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';

import { mutation, query } from './_generated/server';
import { requireLogin } from '../src/usecase/requireLogin';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all documents for the current user.
 * Returns documents sorted by updatedAt (most recent first).
 *
 * @example
 * ```tsx
 * const documents = useQuery(api.documents.getDocuments, { sessionId });
 * ```
 */
export const getDocuments = query({
  args: { ...SessionIdArg },
  handler: async (ctx, args) => {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);

    const documents = await ctx.db
      .query('documents')
      .withIndex('by_user_updated', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect();

    return documents;
  },
});

/**
 * Get a single document by ID.
 * Validates that the document belongs to the current user.
 *
 * @example
 * ```tsx
 * const document = useQuery(api.documents.getDocument, { sessionId, documentId });
 * ```
 */
export const getDocument = query({
  args: {
    ...SessionIdArg,
    documentId: v.id('documents'),
  },
  handler: async (ctx, args) => {
    const { sessionId, documentId } = args;
    const user = await requireLogin(ctx, sessionId);

    const document = await ctx.db.get('documents', documentId);

    if (!document) {
      return null;
    }

    // Verify ownership
    if (document.userId !== user._id) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this document',
      });
    }

    return document;
  },
});

/**
 * Search documents by title.
 * Returns documents where title contains the search query (case-insensitive).
 *
 * @example
 * ```tsx
 * const results = useQuery(api.documents.searchDocuments, { sessionId, query: "meeting" });
 * ```
 */
export const searchDocuments = query({
  args: {
    ...SessionIdArg,
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const { sessionId, query: searchQuery } = args;
    const user = await requireLogin(ctx, sessionId);

    // Get all user documents and filter by title
    // Note: For MVP, we do client-side filtering. For scale, consider full-text search.
    const allDocuments = await ctx.db
      .query('documents')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = allDocuments.filter(
      (doc) =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        (doc.content && doc.content.toLowerCase().includes(lowerQuery))
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
 * Create a new document.
 * Returns the ID of the newly created document.
 *
 * @example
 * ```tsx
 * const createDocument = useMutation(api.documents.createDocument);
 * const docId = await createDocument({ sessionId, title: "My Document" });
 * ```
 */
export const createDocument = mutation({
  args: {
    ...SessionIdArg,
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { sessionId, title, content } = args;
    const user = await requireLogin(ctx, sessionId);

    const now = Date.now();
    const documentId = await ctx.db.insert('documents', {
      userId: user._id,
      title: title || 'Untitled Document',
      content: content || '',
      createdAt: now,
      updatedAt: now,
    });

    return documentId;
  },
});

/**
 * Update an existing document.
 * Validates ownership before updating.
 *
 * @example
 * ```tsx
 * const updateDocument = useMutation(api.documents.updateDocument);
 * await updateDocument({ sessionId, documentId, title: "New Title" });
 * ```
 */
export const updateDocument = mutation({
  args: {
    ...SessionIdArg,
    documentId: v.id('documents'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { sessionId, documentId, title, content } = args;
    const user = await requireLogin(ctx, sessionId);

    const document = await ctx.db.get('documents', documentId);

    if (!document) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      });
    }

    // Verify ownership
    if (document.userId !== user._id) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this document',
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

    await ctx.db.patch('documents', documentId, updates);

    return documentId;
  },
});

/**
 * Delete a document.
 * Validates ownership before deleting.
 *
 * @example
 * ```tsx
 * const deleteDocument = useMutation(api.documents.deleteDocument);
 * await deleteDocument({ sessionId, documentId });
 * ```
 */
export const deleteDocument = mutation({
  args: {
    ...SessionIdArg,
    documentId: v.id('documents'),
  },
  handler: async (ctx, args) => {
    const { sessionId, documentId } = args;
    const user = await requireLogin(ctx, sessionId);

    const document = await ctx.db.get('documents', documentId);

    if (!document) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      });
    }

    // Verify ownership
    if (document.userId !== user._id) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this document',
      });
    }

    await ctx.db.delete('documents', documentId);

    return { success: true };
  },
});
