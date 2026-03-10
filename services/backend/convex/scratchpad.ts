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
 * Create or update the user's scratchpad content with optimistic concurrency control.
 *
 * When `expectedVersion` is provided, the mutation will reject the write if the
 * server's current version doesn't match, indicating a concurrent modification.
 * The client should re-fetch and resolve the conflict.
 *
 * Returns `{ id, version, updatedAt }` on success, or `{ conflict: true, ... }`
 * if the write was rejected due to version mismatch.
 *
 * @example
 * ```tsx
 * const upsertScratchpad = useSessionMutation(api.scratchpad.upsertScratchpad);
 * const result = await upsertScratchpad({ content: '<p>My notes</p>', expectedVersion: 5 });
 * if (result.conflict) { /* handle conflict *\/ }
 * ```
 */
export const upsertScratchpad = mutation({
  args: {
    ...SessionIdArg,
    content: v.optional(v.string()),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { sessionId, content, expectedVersion } = args;
    const user = await requireLogin(ctx, sessionId);

    const existing = await ctx.db
      .query('scratchpad')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (existing === null) {
      const now = Date.now();
      const id = await ctx.db.insert('scratchpad', {
        userId: user._id,
        content,
        updatedAt: now,
        version: 1,
      });
      return { id, version: 1, updatedAt: now, conflict: false };
    }

    const currentVersion = existing.version ?? 0;

    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      return {
        id: existing._id,
        version: currentVersion,
        updatedAt: existing.updatedAt,
        conflict: true,
      };
    }

    const newVersion = currentVersion + 1;
    const now = Date.now();
    await ctx.db.patch('scratchpad', existing._id, {
      content,
      updatedAt: now,
      version: newVersion,
    });
    return { id: existing._id, version: newVersion, updatedAt: now, conflict: false };
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

      const newVersion = (existing.version ?? 0) + 1;
      await ctx.db.patch('scratchpad', existing._id, {
        content: undefined,
        updatedAt: Date.now(),
        version: newVersion,
      });
    } else if (existing !== null) {
      const newVersion = (existing.version ?? 0) + 1;
      await ctx.db.patch('scratchpad', existing._id, {
        updatedAt: Date.now(),
        version: newVersion,
      });
    }

    return archiveId;
  },
});
