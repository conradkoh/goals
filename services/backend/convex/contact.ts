import { ConvexError, v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { requireLogin } from '../src/usecase/requireLogin';

const normalizedOptional = (value: string | null | undefined): string | undefined => {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

function sortContactsByName(contacts: Doc<'contacts'>[]): Doc<'contacts'>[] {
  return [...contacts].sort((a, b) => a.name.localeCompare(b.name));
}

// fallow-ignore-next-line complexity
function matchesContactSearch(contact: Doc<'contacts'>, search: string): boolean {
  const needle = search.toLowerCase();
  return (
    contact.name.toLowerCase().includes(needle) ||
    (contact.email?.toLowerCase().includes(needle) ?? false) ||
    (contact.organization?.toLowerCase().includes(needle) ?? false)
  );
}

async function getOwnedContactForMutation(
  ctx: MutationCtx,
  contactId: Id<'contacts'>,
  userId: Id<'users'>
): Promise<Doc<'contacts'>> {
  const contact = await ctx.db.get('contacts', contactId);
  if (!contact) {
    throw new ConvexError({ code: 'NOT_FOUND', message: 'Contact not found' });
  }
  if (contact.userId !== userId) {
    throw new ConvexError({
      code: 'UNAUTHORIZED',
      message: 'You do not have permission to access this contact',
    });
  }
  return contact;
}

async function getOwnedGoalForMutation(
  ctx: MutationCtx,
  goalId: Id<'goals'>,
  userId: Id<'users'>
): Promise<Doc<'goals'>> {
  const goal = await ctx.db.get('goals', goalId);
  if (!goal) {
    throw new ConvexError({ code: 'NOT_FOUND', message: 'Goal not found' });
  }
  if (goal.userId !== userId) {
    throw new ConvexError({
      code: 'UNAUTHORIZED',
      message: 'You do not have permission to access this goal',
    });
  }
  return goal;
}

async function getOwnedGoalLogForMutation(
  ctx: MutationCtx,
  goalLogId: Id<'goalLogs'>,
  userId: Id<'users'>
): Promise<Doc<'goalLogs'>> {
  const goalLog = await ctx.db.get('goalLogs', goalLogId);
  if (!goalLog) {
    throw new ConvexError({ code: 'NOT_FOUND', message: 'Goal log not found' });
  }
  if (goalLog.userId !== userId) {
    throw new ConvexError({
      code: 'UNAUTHORIZED',
      message: 'You do not have permission to access this goal log',
    });
  }
  return goalLog;
}

async function validateOwnedContacts(
  ctx: MutationCtx,
  contactIds: Id<'contacts'>[],
  userId: Id<'users'>
): Promise<void> {
  for (const contactId of contactIds) {
    await getOwnedContactForMutation(ctx, contactId, userId);
  }
}

// fallow-ignore-next-line complexity
async function replaceGoalContacts(
  ctx: MutationCtx,
  userId: Id<'users'>,
  goalId: Id<'goals'>,
  contactIds: Id<'contacts'>[]
): Promise<void> {
  const uniqueContactIds = [...new Set(contactIds)];
  await getOwnedGoalForMutation(ctx, goalId, userId);
  await validateOwnedContacts(ctx, uniqueContactIds, userId);

  const currentLinks = await ctx.db
    .query('goalContacts')
    .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
    .collect();

  const desiredSet = new Set(uniqueContactIds.map((id) => id.toString()));
  const currentSet = new Set(currentLinks.map((link) => link.contactId.toString()));
  const now = Date.now();

  for (const link of currentLinks) {
    if (!desiredSet.has(link.contactId.toString())) {
      await ctx.db.delete('goalContacts', link._id);
    }
  }

  for (const contactId of uniqueContactIds) {
    if (!currentSet.has(contactId.toString())) {
      await ctx.db.insert('goalContacts', {
        userId,
        goalId,
        contactId,
        createdAt: now,
      });
    }
  }
}

// fallow-ignore-next-line complexity
async function replaceGoalLogContacts(
  ctx: MutationCtx,
  userId: Id<'users'>,
  goalLogId: Id<'goalLogs'>,
  contactIds: Id<'contacts'>[]
): Promise<void> {
  const uniqueContactIds = [...new Set(contactIds)];
  await getOwnedGoalLogForMutation(ctx, goalLogId, userId);
  await validateOwnedContacts(ctx, uniqueContactIds, userId);

  const currentLinks = await ctx.db
    .query('goalLogContacts')
    .withIndex('by_user_and_goal_log', (q) => q.eq('userId', userId).eq('goalLogId', goalLogId))
    .collect();

  const desiredSet = new Set(uniqueContactIds.map((id) => id.toString()));
  const currentSet = new Set(currentLinks.map((link) => link.contactId.toString()));
  const now = Date.now();

  for (const link of currentLinks) {
    if (!desiredSet.has(link.contactId.toString())) {
      await ctx.db.delete('goalLogContacts', link._id);
    }
  }

  for (const contactId of uniqueContactIds) {
    if (!currentSet.has(contactId.toString())) {
      await ctx.db.insert('goalLogContacts', {
        userId,
        goalLogId,
        contactId,
        createdAt: now,
      });
    }
  }
}

async function getLinkedContactsForGoal(
  ctx: QueryCtx,
  userId: Id<'users'>,
  goalId: Id<'goals'>
): Promise<Doc<'contacts'>[]> {
  const goal = await ctx.db.get('goals', goalId);
  if (!goal || goal.userId !== userId) return [];

  const links = await ctx.db
    .query('goalContacts')
    .withIndex('by_user_and_goal', (q) => q.eq('userId', userId).eq('goalId', goalId))
    .collect();

  const contacts = (
    await Promise.all(links.map((link) => ctx.db.get('contacts', link.contactId)))
  ).filter((contact): contact is Doc<'contacts'> => contact !== null && contact.userId === userId);

  return sortContactsByName(contacts);
}

async function getLinkedContactsForGoalLog(
  ctx: QueryCtx,
  userId: Id<'users'>,
  goalLogId: Id<'goalLogs'>
): Promise<Doc<'contacts'>[]> {
  const goalLog = await ctx.db.get('goalLogs', goalLogId);
  if (!goalLog || goalLog.userId !== userId) return [];

  const links = await ctx.db
    .query('goalLogContacts')
    .withIndex('by_user_and_goal_log', (q) => q.eq('userId', userId).eq('goalLogId', goalLogId))
    .collect();

  const contacts = (
    await Promise.all(links.map((link) => ctx.db.get('contacts', link.contactId)))
  ).filter((contact): contact is Doc<'contacts'> => contact !== null && contact.userId === userId);

  return sortContactsByName(contacts);
}

export const createContact = mutation({
  args: {
    ...SessionIdArg,
    name: v.string(),
    email: v.optional(v.string()),
    organization: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<'contacts'>> => {
    const { sessionId, name, email, organization, notes } = args;
    const user = await requireLogin(ctx, sessionId);
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Contact name cannot be empty',
      });
    }

    const now = Date.now();
    return await ctx.db.insert('contacts', {
      userId: user._id,
      name: trimmedName,
      email: normalizedOptional(email),
      organization: normalizedOptional(organization),
      notes: normalizedOptional(notes),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateContact = mutation({
  args: {
    ...SessionIdArg,
    contactId: v.id('contacts'),
    name: v.optional(v.string()),
    email: v.optional(v.union(v.string(), v.null())),
    organization: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  // fallow-ignore-next-line complexity
  handler: async (ctx, args): Promise<void> => {
    const { sessionId, contactId, name, email, organization, notes } = args;
    const user = await requireLogin(ctx, sessionId);
    await getOwnedContactForMutation(ctx, contactId, user._id);

    const updates: Partial<Doc<'contacts'>> = { updatedAt: Date.now() };
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new ConvexError({
          code: 'INVALID_ARGUMENT',
          message: 'Contact name cannot be empty',
        });
      }
      updates.name = trimmedName;
    }
    if (email !== undefined) updates.email = normalizedOptional(email);
    if (organization !== undefined) updates.organization = normalizedOptional(organization);
    if (notes !== undefined) updates.notes = normalizedOptional(notes);

    await ctx.db.patch('contacts', contactId, updates);
  },
});

export const deleteContact = mutation({
  args: { ...SessionIdArg, contactId: v.id('contacts') },
  handler: async (ctx, args): Promise<void> => {
    const { sessionId, contactId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;
    await getOwnedContactForMutation(ctx, contactId, userId);

    const goalLinks = await ctx.db
      .query('goalContacts')
      .withIndex('by_user_and_contact', (q) => q.eq('userId', userId).eq('contactId', contactId))
      .collect();
    if (goalLinks.length > 0) {
      throw new ConvexError({
        code: 'RESOURCE_IN_USE',
        message: `Cannot delete contact: linked to ${goalLinks.length} goal(s). Remove associations first.`,
      });
    }

    const logLinks = await ctx.db
      .query('goalLogContacts')
      .withIndex('by_user_and_contact', (q) => q.eq('userId', userId).eq('contactId', contactId))
      .collect();
    if (logLinks.length > 0) {
      throw new ConvexError({
        code: 'RESOURCE_IN_USE',
        message: `Cannot delete contact: linked to ${logLinks.length} goal log(s). Remove associations first.`,
      });
    }

    await ctx.db.delete('contacts', contactId);
  },
});

export const getContacts = query({
  args: { ...SessionIdArg, search: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Doc<'contacts'>[]> => {
    const { sessionId, search } = args;
    const user = await requireLogin(ctx, sessionId);
    const contacts = await ctx.db
      .query('contacts')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    const trimmedSearch = search?.trim();
    const filtered =
      trimmedSearch && trimmedSearch.length > 0
        ? contacts.filter((contact) => matchesContactSearch(contact, trimmedSearch))
        : contacts;

    return sortContactsByName(filtered);
  },
});

export const getContact = query({
  args: { ...SessionIdArg, contactId: v.id('contacts') },
  handler: async (ctx, args): Promise<Doc<'contacts'> | null> => {
    const { sessionId, contactId } = args;
    const user = await requireLogin(ctx, sessionId);
    const contact = await ctx.db.get('contacts', contactId);
    if (!contact || contact.userId !== user._id) return null;
    return contact;
  },
});

export const setGoalContacts = mutation({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    contactIds: v.array(v.id('contacts')),
  },
  handler: async (ctx, args): Promise<void> => {
    const { sessionId, goalId, contactIds } = args;
    const user = await requireLogin(ctx, sessionId);
    await replaceGoalContacts(ctx, user._id, goalId, contactIds);
  },
});

export const getGoalContacts = query({
  args: { ...SessionIdArg, goalId: v.id('goals') },
  handler: async (ctx, args): Promise<Doc<'contacts'>[]> => {
    const { sessionId, goalId } = args;
    const user = await requireLogin(ctx, sessionId);
    return await getLinkedContactsForGoal(ctx, user._id, goalId);
  },
});

export const setGoalLogContacts = mutation({
  args: {
    ...SessionIdArg,
    goalLogId: v.id('goalLogs'),
    contactIds: v.array(v.id('contacts')),
  },
  handler: async (ctx, args): Promise<void> => {
    const { sessionId, goalLogId, contactIds } = args;
    const user = await requireLogin(ctx, sessionId);
    await replaceGoalLogContacts(ctx, user._id, goalLogId, contactIds);
  },
});

export const getGoalLogContacts = query({
  args: { ...SessionIdArg, goalLogId: v.id('goalLogs') },
  handler: async (ctx, args): Promise<Doc<'contacts'>[]> => {
    const { sessionId, goalLogId } = args;
    const user = await requireLogin(ctx, sessionId);
    return await getLinkedContactsForGoalLog(ctx, user._id, goalLogId);
  },
});

export type ContactWork = {
  contact: Doc<'contacts'>;
  goals: Doc<'goals'>[];
  logs: Doc<'goalLogs'>[];
};

export const getContactWork = query({
  args: { ...SessionIdArg, contactId: v.id('contacts') },
  handler: async (ctx, args): Promise<ContactWork | null> => {
    const { sessionId, contactId } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const contact = await ctx.db.get('contacts', contactId);
    if (!contact || contact.userId !== userId) return null;

    const goalLinks = await ctx.db
      .query('goalContacts')
      .withIndex('by_user_and_contact', (q) => q.eq('userId', userId).eq('contactId', contactId))
      .collect();

    const logLinks = await ctx.db
      .query('goalLogContacts')
      .withIndex('by_user_and_contact', (q) => q.eq('userId', userId).eq('contactId', contactId))
      .collect();

    const goals = (
      await Promise.all(goalLinks.map((link) => ctx.db.get('goals', link.goalId)))
    ).filter((goal): goal is Doc<'goals'> => goal !== null && goal.userId === userId);

    const logs = (
      await Promise.all(logLinks.map((link) => ctx.db.get('goalLogs', link.goalLogId)))
    ).filter((log): log is Doc<'goalLogs'> => log !== null && log.userId === userId);

    return { contact, goals, logs };
  },
});
