import { v } from 'convex/values';

import type { Doc, Id } from '../_generated/dataModel';
import { internalQuery } from '../_generated/server';

/**
 * Read-only helpers for the `POST /cli/v1/call` gateway.
 *
 * Every function normalises a request-supplied id string before it can reach a
 * typed Convex function, and returns `null` for foreign, missing, malformed and
 * wrong-table ids alike. That makes the gateway's 404 indistinguishable for all
 * four cases, so an id cannot probe another user's data or trigger a Convex
 * validator error that embeds the argument.
 *
 * Nothing here writes: all goal tables are mutated only by the existing public
 * mutations the gateway calls.
 */

/** Ownership and shape facts the gateway needs before calling an existing function. */
export type OwnedGoalMeta = {
  id: Id<'goals'>;
  depth: number;
  isAdhoc: boolean;
  year: number;
  quarter?: number;
  dueDate?: number;
};

/** True when a goal row is an adhoc goal (never a quarterly/weekly/daily goal). */
function isAdhocGoal(doc: Doc<'goals'>): boolean {
  return doc.adhoc !== undefined || doc.depth === -1;
}

/** Projects a goal doc to the metadata the gateway needs. */
function toOwnedGoalMeta(doc: Doc<'goals'>): OwnedGoalMeta {
  const adhoc = isAdhocGoal(doc);
  return {
    id: doc._id,
    depth: doc.depth,
    isAdhoc: adhoc,
    year: doc.year,
    quarter: adhoc ? undefined : doc.quarter,
    dueDate: doc.dueDate,
  };
}

/**
 * Loads a goal owned by `userId`.
 *
 * @param userId - owner the caller authenticated as
 * @param goalId - raw id string from the request
 * @returns the normalised goal metadata, or `null` when unusable
 */
export const getOwnedGoalMeta = internalQuery({
  args: { userId: v.id('users'), goalId: v.string() },
  handler: async (ctx, { userId, goalId }): Promise<OwnedGoalMeta | null> => {
    const id = ctx.db.normalizeId('goals', goalId);
    if (id === null) return null;
    const doc = await ctx.db.get('goals', id);
    if (!doc || doc.userId !== userId) return null;
    return toOwnedGoalMeta(doc);
  },
});

/** Loads an initiative owned by `userId`, or `null` for unusable ids. */
export const getOwnedInitiativeId = internalQuery({
  args: { userId: v.id('users'), initiativeId: v.string() },
  handler: async (ctx, { userId, initiativeId }): Promise<Id<'initiatives'> | null> => {
    const id = ctx.db.normalizeId('initiatives', initiativeId);
    if (id === null) return null;
    const doc = await ctx.db.get('initiatives', id);
    if (!doc || doc.userId !== userId) return null;
    return doc._id;
  },
});

/** Loads a domain owned by `userId`, or `null` for unusable ids. */
export const getOwnedDomainId = internalQuery({
  args: { userId: v.id('users'), domainId: v.string() },
  handler: async (ctx, { userId, domainId }): Promise<Id<'domains'> | null> => {
    const id = ctx.db.normalizeId('domains', domainId);
    if (id === null) return null;
    const doc = await ctx.db.get('domains', id);
    if (!doc || doc.userId !== userId) return null;
    return doc._id;
  },
});

/** Identity metadata returned by `auth.whoami`; never includes a token or handle. */
export type WhoamiResult = {
  userId: Id<'users'>;
  name: string;
  email?: string;
  credentialId: Id<'cliCredentials'>;
  machineName: string;
  environment?: string;
  createdAt: number;
  expiresAt: number;
};

/** The email a `full` user shares with the CLI; anonymous users have none. */
function userEmail(user: Doc<'users'>): string | undefined {
  return user.type === 'full' ? user.email : undefined;
}

/** True when a credential row may still authenticate. */
function isUsableCredential(
  credential: Doc<'cliCredentials'>,
  userId: Id<'users'>,
  now: number
): boolean {
  return (
    credential.userId === userId && credential.revokedAt === undefined && credential.expiresAt > now
  );
}

/** Projects a user and credential to the whoami wire shape. */
function toWhoami(user: Doc<'users'>, credential: Doc<'cliCredentials'>): WhoamiResult {
  return {
    userId: user._id,
    name: user.name,
    email: userEmail(user),
    credentialId: credential._id,
    machineName: credential.machineName,
    environment: credential.environment,
    createdAt: credential.createdAt,
    expiresAt: credential.expiresAt,
  };
}

/**
 * Re-reads the credential behind a resolved handle.
 *
 * Returns `null` when the credential was revoked between `resolveHandle` and
 * this query, or when the user disappeared, so the gateway can answer 401.
 */
export const getWhoami = internalQuery({
  args: { credentialId: v.id('cliCredentials'), userId: v.id('users') },
  handler: async (ctx, { credentialId, userId }): Promise<WhoamiResult | null> => {
    const credential = await ctx.db.get('cliCredentials', credentialId);
    if (credential === null) return null;
    if (!isUsableCredential(credential, userId, Date.now())) return null;
    const user = await ctx.db.get('users', userId);
    return user === null ? null : toWhoami(user, credential);
  },
});
