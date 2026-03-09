/**
 * Scratchpad backend module.
 *
 * Provides a global per-user scratchpad with auto-save and archive support.
 * The scratchpad is not tied to any specific week or day — it persists across sessions.
 * Content is stored as HTML (from RichTextEditor/Tiptap).
 *
 * @module scratchpad
 */

import { v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';

import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { requireLogin } from '../src/usecase/requireLogin';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the current user's scratchpad.
 * Returns `null` if no scratchpad exists yet (the frontend shows an empty editor).
 *
 * @example
 * ```tsx
 * const scratchpad = useSessionQuery(api.scratchpad.getScratchpad, {});
 * ```
 */
export const getScratchpad = query({
  args: { ...SessionIdArg },
  handler: async (ctx, args) => {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);

    const scratchpad = await ctx.db
      .query('scratchpad')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    return scratchpad ?? null;
  },
});

/**
 * List the most recent archived scratchpads for the current user.
 * Returns up to 50 entries sorted by most recent first.
 */
export const listArchivedScratchpads = query({
  args: { ...SessionIdArg },
  handler: async (ctx, args) => {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);

    const archives = await ctx.db
      .query('scratchpadArchive')
      .withIndex('by_user_archived', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(50);

    return archives;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create or update the user's scratchpad content.
 * If no scratchpad record exists, creates one.
 * If one exists, patches it with the new content and updates `updatedAt`.
 *
 * @example
 * ```tsx
 * const upsertScratchpad = useSessionMutation(api.scratchpad.upsertScratchpad);
 * await upsertScratchpad({ content: '<p>My notes</p>' });
 * ```
 */
export const upsertScratchpad = mutation({
  args: {
    ...SessionIdArg,
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { sessionId, content } = args;
    const user = await requireLogin(ctx, sessionId);

    const existing = await ctx.db
      .query('scratchpad')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (existing === null) {
      // Create new scratchpad record
      const id = await ctx.db.insert('scratchpad', {
        userId: user._id,
        content,
        updatedAt: Date.now(),
      });
      return id;
    }
    // Update existing record
    await ctx.db.patch('scratchpad', existing._id, {
      content,
      updatedAt: Date.now(),
    });
    return existing._id;
  },
});

/**
 * Archive the current scratchpad content and clear it.
 *
 * Steps:
 * 1. Reads current scratchpad content
 * 2. If content is non-empty, inserts an archive record
 * 3. Clears the scratchpad content and updates `updatedAt`
 * 4. Returns the archive entry ID (or `null` if nothing was archived)
 *
 * @example
 * ```tsx
 * const archiveScratchpad = useSessionMutation(api.scratchpad.archiveScratchpad);
 * const archiveId = await archiveScratchpad({});
 * ```
 */
export const archiveScratchpad = mutation({
  args: { ...SessionIdArg },
  handler: async (ctx, args) => {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);

    const existing = await ctx.db
      .query('scratchpad')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    let archiveId: Id<'scratchpadArchive'> | null = null;
    if (existing !== null && existing.content && existing.content.trim().length > 0) {
      archiveId = await ctx.db.insert('scratchpadArchive', {
        userId: user._id,
        content: existing.content,
        archivedAt: Date.now(),
      });

      // Clear the scratchpad content
      await ctx.db.patch('scratchpad', existing._id, {
        content: undefined,
        updatedAt: Date.now(),
      });
    } else if (existing !== null) {
      // Scratchpad exists but is empty — still update the timestamp
      await ctx.db.patch('scratchpad', existing._id, {
        updatedAt: Date.now(),
      });
    }

    return archiveId;
  },
});
