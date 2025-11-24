import { ConvexError, v } from 'convex/values';
import { requireLogin } from '../src/usecase/requireLogin';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

/**
 * Creates a new domain for the authenticated user.
 *
 * @param ctx - Convex mutation context
 * @param args - Mutation arguments containing session and domain details
 * @returns Promise resolving to the new domain ID
 *
 * @example
 * ```typescript
 * const domainId = await createDomain(ctx, {
 *   sessionId: "session123",
 *   name: "Home Maintenance",
 *   description: "Tasks related to home upkeep",
 *   color: "#3B82F6"
 * });
 * ```
 */
export const createDomain = mutation({
  args: {
    sessionId: v.id('sessions'),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<'domains'>> => {
    const { sessionId, name, description, color } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Validate name is not empty
    if (!name.trim()) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Domain name cannot be empty',
      });
    }

    // Check for duplicate domain names for this user
    const existingDomains = await ctx.db
      .query('domains')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('name'), name.trim()))
      .collect();

    if (existingDomains.length > 0) {
      throw new ConvexError({
        code: 'ALREADY_EXISTS',
        message: 'A domain with this name already exists',
      });
    }

    const domainId = await ctx.db.insert('domains', {
      userId,
      name: name.trim(),
      description: description?.trim(),
      color,
    });

    return domainId;
  },
});

/**
 * Updates an existing domain.
 *
 * @param ctx - Convex mutation context
 * @param args - Mutation arguments containing session, domain ID, and updates
 * @returns Promise resolving when update is complete
 */
export const updateDomain = mutation({
  args: {
    sessionId: v.id('sessions'),
    domainId: v.id('domains'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const { sessionId, domainId, name, description, color } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the domain and verify ownership
    const domain = await ctx.db.get(domainId);
    if (!domain) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Domain not found',
      });
    }
    if (domain.userId !== userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You do not have permission to update this domain',
      });
    }

    // Validate name if provided
    if (name !== undefined && !name.trim()) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Domain name cannot be empty',
      });
    }

    // Check for duplicate names if name is being changed
    if (name !== undefined && name.trim() !== domain.name) {
      const existingDomains = await ctx.db
        .query('domains')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .filter((q) => q.and(q.eq(q.field('name'), name.trim()), q.neq(q.field('_id'), domainId)))
        .collect();

      if (existingDomains.length > 0) {
        throw new ConvexError({
          code: 'ALREADY_EXISTS',
          message: 'A domain with this name already exists',
        });
      }
    }

    // Prepare updates
    const updates: Partial<Doc<'domains'>> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim();
    if (color !== undefined) updates.color = color;

    await ctx.db.patch(domainId, updates);
  },
});

/**
 * Deletes a domain.
 *
 * @param ctx - Convex mutation context
 * @param args - Mutation arguments containing session and domain ID
 * @returns Promise resolving when deletion is complete
 */
export const deleteDomain = mutation({
  args: {
    sessionId: v.id('sessions'),
    domainId: v.id('domains'),
  },
  handler: async (ctx, args): Promise<void> => {
    const { sessionId, domainId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    // Find the domain and verify ownership
    const domain = await ctx.db.get(domainId);
    if (!domain) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Domain not found',
      });
    }
    if (domain.userId !== userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You do not have permission to delete this domain',
      });
    }

    // Check if any goals are using this domain (check both goal.domainId and goal.adhoc.domainId)
    const goalsUsingDomainAtGoalLevel = await ctx.db
      .query('goals')
      .withIndex('by_user_and_domain', (q) => q.eq('userId', userId).eq('domainId', domainId))
      .collect();

    // No longer need to check adhoc.domainId - all domain IDs are at goal level now
    // const goalsUsingDomainInAdhoc = ...

    const totalGoalsUsingDomain = goalsUsingDomainAtGoalLevel.length;

    if (totalGoalsUsingDomain > 0) {
      throw new ConvexError({
        code: 'RESOURCE_IN_USE',
        message: `Cannot delete domain: ${totalGoalsUsingDomain} goal(s) are using this domain. Move or delete these goals first.`,
      });
    }

    // Delete the domain
    await ctx.db.delete(domainId);
  },
});

/**
 * Retrieves all domains for the authenticated user.
 *
 * @param ctx - Convex query context
 * @param args - Query arguments containing session
 * @returns Promise resolving to array of domains
 */
export const getDomains = query({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args): Promise<Doc<'domains'>[]> => {
    const { sessionId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const domains = await ctx.db
      .query('domains')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    // Sort by creation time (newest first) then by name
    return domains.sort((a, b) => {
      if (a._creationTime !== b._creationTime) {
        return b._creationTime - a._creationTime;
      }
      return a.name.localeCompare(b.name);
    });
  },
});

/**
 * Retrieves a specific domain by ID.
 *
 * @param ctx - Convex query context
 * @param args - Query arguments containing session and domain ID
 * @returns Promise resolving to the domain or null if not found
 */
export const getDomain = query({
  args: {
    sessionId: v.id('sessions'),
    domainId: v.id('domains'),
  },
  handler: async (ctx, args): Promise<Doc<'domains'> | null> => {
    const { sessionId, domainId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const domain = await ctx.db.get(domainId);
    if (!domain || domain.userId !== userId) {
      return null;
    }

    return domain;
  },
});
