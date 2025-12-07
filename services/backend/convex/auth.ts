import { ConvexError, v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';
import { featureFlags } from '../config/featureFlags';
import { getAccessLevel, isSystemAdmin } from '../modules/auth/accessControl';
import { generateLoginCode, getCodeExpirationTime, isCodeExpired } from '../modules/auth/codeUtils';
import type { AuthState } from '../modules/auth/types/AuthState';
import { api, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
  type ActionCtx,
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';

/**
 * Retrieves the current authentication state for a session.
 */
export const getState = query({
  args: {
    ...SessionIdArg,
  },
  handler: async (ctx, args): Promise<AuthState> => {
    const exists = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!exists) {
      return {
        sessionId: args.sessionId,
        state: 'unauthenticated' as const,
        reason: 'session_not_found' as const,
      };
    }

    if (!exists.userId) {
      return {
        sessionId: args.sessionId,
        state: 'unauthenticated' as const, //this session was unlinked from the user
        reason: 'session_deauthorized' as const,
      };
    }

    const user = await ctx.db.get(exists.userId);

    if (!user) {
      return {
        sessionId: args.sessionId,
        state: 'unauthenticated' as const, //the linked user log longer exists
        reason: 'user_not_found' as const,
      };
    }

    return {
      sessionId: args.sessionId,
      state: 'authenticated' as const,
      user,
      accessLevel: getAccessLevel(user),
      isSystemAdmin: isSystemAdmin(user),
      authMethod: exists.authMethod,
    };
  },
});

/**
 * Creates an anonymous user and establishes a session for them.
 */
export const loginAnon = mutation({
  args: {
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Check if login is disabled
    if (featureFlags.disableLogin) {
      throw new ConvexError({
        code: 'FEATURE_DISABLED',
        message: 'Login functionality is currently disabled',
      });
    }

    // Check if the session exists
    const existingSession = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    // Create an anonymous user
    const anonName = _generateAnonUsername();
    const userId = await ctx.db.insert('users', {
      type: 'anonymous',
      name: anonName,
      accessLevel: 'user', // Default access level for new anonymous users
    });

    // Create a new session if it doesn't exist
    if (!existingSession) {
      const now = Date.now();
      await ctx.db.insert('sessions', {
        sessionId: args.sessionId,
        userId: userId as Id<'users'>,
        createdAt: now,
        authMethod: 'anonymous',
      });
    } else {
      // Update existing session with the new user and auth method
      await ctx.db.patch(existingSession._id, {
        userId: userId as Id<'users'>,
        authMethod: 'anonymous',
      });
    }

    return { success: true, userId };
  },
});

/**
 * Logs out a user by deleting their session.
 */
export const logout = mutation({
  args: {
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Find the session by sessionId
    const existingSession = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (existingSession) {
      await ctx.db.delete(existingSession._id);
    }

    return { success: true };
  },
});

/**
 * Updates the display name for an authenticated user.
 */
export const updateUserName = mutation({
  args: {
    newName: v.string(),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Validate input
    if (args.newName.trim().length < 3) {
      return {
        success: false,
        reason: 'name_too_short',
        message: 'Name must be at least 3 characters long',
      };
    }

    if (args.newName.trim().length > 30) {
      return {
        success: false,
        reason: 'name_too_long',
        message: 'Name must be at most 30 characters long',
      };
    }

    // Find the session by sessionId
    const existingSession = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!existingSession || !existingSession.userId) {
      return {
        success: false,
        reason: 'not_authenticated',
        message: 'You must be logged in to update your profile',
      };
    }

    // Get the user
    const user = await ctx.db.get(existingSession.userId);
    if (!user) {
      return {
        success: false,
        reason: 'user_not_found',
        message: 'User not found',
      };
    }

    // Update the user's name
    await ctx.db.patch(existingSession.userId, {
      name: args.newName.trim(),
    });

    return {
      success: true,
      message: 'Name updated successfully',
    };
  },
});

/**
 * Retrieves the active login code for the current authenticated user.
 */
export const getActiveLoginCode = query({
  args: {
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Check if login is disabled
    if (featureFlags.disableLogin) {
      return {
        success: false,
        reason: 'feature_disabled',
        message: 'Login functionality is currently disabled',
      };
    }

    // Find the session by sessionId
    const existingSession = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!existingSession || !existingSession.userId) {
      return { success: false, reason: 'not_authenticated' };
    }

    const now = Date.now();

    // Find any active code for this user
    const activeCode = await ctx.db
      .query('loginCodes')
      .filter((q) =>
        q.and(q.eq(q.field('userId'), existingSession.userId), q.gt(q.field('expiresAt'), now))
      )
      .first();

    if (!activeCode) {
      return { success: false, reason: 'no_active_code' };
    }

    return {
      success: true,
      code: activeCode.code,
      expiresAt: activeCode.expiresAt,
    };
  },
});

/**
 * Generates a temporary login code for cross-device authentication.
 */
export const createLoginCode = mutation({
  args: {
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Check if login is disabled
    if (featureFlags.disableLogin) {
      throw new ConvexError({
        code: 'FEATURE_DISABLED',
        message: 'Login functionality is currently disabled',
      });
    }

    // Find the session by sessionId
    const existingSession = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!existingSession || !existingSession.userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to generate a login code',
      });
    }

    // Get the user
    const user = await ctx.db.get(existingSession.userId);
    if (!user) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const now = Date.now();

    // Delete any existing active codes for this user
    const existingCodes = await ctx.db
      .query('loginCodes')
      .filter((q) => q.eq(q.field('userId'), existingSession.userId))
      .collect();

    // Delete all existing codes for this user
    for (const code of existingCodes) {
      await ctx.db.delete(code._id);
    }

    // Generate a new login code
    const codeString = generateLoginCode();
    const expiresAt = getCodeExpirationTime();

    // Store the code in the database
    await ctx.db.insert('loginCodes', {
      code: codeString,
      userId: existingSession.userId,
      createdAt: now,
      expiresAt,
    });

    return {
      success: true,
      code: codeString,
      expiresAt,
    };
  },
});

/**
 * Verifies and consumes a login code to authenticate a session.
 */
export const verifyLoginCode = mutation({
  args: {
    code: v.string(),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Check if login is disabled
    if (featureFlags.disableLogin) {
      return {
        success: false,
        reason: 'feature_disabled',
        message: 'Login functionality is currently disabled',
      };
    }

    // Clean up the code (removing dashes if any)
    const cleanCode = args.code.replace(/-/g, '').toUpperCase();

    // Find the login code
    const loginCode = await ctx.db
      .query('loginCodes')
      .withIndex('by_code', (q) => q.eq('code', cleanCode))
      .first();

    if (!loginCode) {
      return {
        success: false,
        reason: 'invalid_code',
        message: 'Invalid login code',
      };
    }

    // Check if the code is expired
    if (isCodeExpired(loginCode.expiresAt)) {
      // Delete the expired code
      await ctx.db.delete(loginCode._id);
      return {
        success: false,
        reason: 'code_expired',
        message: 'This login code has expired',
      };
    }

    // Get the user associated with the code
    const user = await ctx.db.get(loginCode.userId);
    if (!user) {
      return {
        success: false,
        reason: 'user_not_found',
        message: 'User not found',
      };
    }

    // Delete the code once used
    await ctx.db.delete(loginCode._id);

    // Check if the session exists
    const existingSession = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    // Create or update session
    const now = Date.now();

    if (existingSession) {
      // Update existing session to point to the user
      await ctx.db.patch(existingSession._id, {
        userId: loginCode.userId,
        authMethod: 'login_code',
      });
    } else {
      // Create a new session
      await ctx.db.insert('sessions', {
        sessionId: args.sessionId,
        userId: loginCode.userId,
        createdAt: now,
        authMethod: 'login_code',
      });
    }

    return {
      success: true,
      message: 'Login successful',
      user,
    };
  },
});

/**
 * Checks if a login code is still valid (exists and not expired).
 */
export const checkCodeValidity = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if login is disabled
    if (featureFlags.disableLogin) {
      return false;
    }

    // Clean up the code (removing dashes if any)
    const cleanCode = args.code.replace(/-/g, '').toUpperCase();

    // Find the login code
    const loginCode = await ctx.db
      .query('loginCodes')
      .withIndex('by_code', (q) => q.eq('code', cleanCode))
      .first();

    // If the code doesn't exist, it's not valid
    if (!loginCode) {
      return false;
    }

    // Check if the code is expired
    if (isCodeExpired(loginCode.expiresAt)) {
      return false;
    }

    // The code exists and is not expired, so it's valid
    return true;
  },
});

/**
 * Gets or creates a recovery code for the current authenticated user.
 */
export const getOrCreateRecoveryCode = action({
  args: { ...SessionIdArg },
  handler: async (
    ctx: ActionCtx,
    args: { sessionId: string }
  ): Promise<{ success: boolean; recoveryCode?: string; reason?: string }> => {
    // Check if login is disabled
    if (featureFlags.disableLogin) {
      return {
        success: false,
        reason: 'feature_disabled',
      };
    }

    // Find the session by sessionId
    const existingSession = await ctx.runQuery(internal.auth.getSessionBySessionId, {
      sessionId: args.sessionId,
    });

    if (!existingSession || !existingSession.userId) {
      return { success: false, reason: 'not_authenticated' };
    }

    // Get the user
    const user = await ctx.runQuery(internal.auth.getUserById, {
      userId: existingSession.userId,
    });

    if (!user) {
      return { success: false, reason: 'user_not_found' };
    }

    // If user already has a recovery code, return it
    if (user.recoveryCode) {
      return { success: true, recoveryCode: user.recoveryCode };
    }

    // Otherwise, generate a new recovery code using the crypto action
    const code: string = await ctx.runAction(api.crypto.generateRecoveryCode, { length: 128 });
    await ctx.runMutation(internal.auth.updateUserRecoveryCode, {
      userId: existingSession.userId,
      recoveryCode: code,
    });

    return { success: true, recoveryCode: code };
  },
});

/**
 * Verifies a recovery code and authenticates the session if valid.
 */
export const verifyRecoveryCode = action({
  args: { recoveryCode: v.string(), ...SessionIdArg },
  handler: async (
    ctx: ActionCtx,
    args: { recoveryCode: string; sessionId: string }
  ): Promise<{ success: boolean; user?: Doc<'users'>; reason?: string }> => {
    // Check if login is disabled
    if (featureFlags.disableLogin) {
      return {
        success: false,
        reason: 'feature_disabled',
      };
    }

    // Find the user with the given recovery code
    const user = await ctx.runQuery(internal.auth.getUserByRecoveryCode, {
      recoveryCode: args.recoveryCode,
    });

    if (!user) {
      return { success: false, reason: 'invalid_code' };
    }

    // Check if the session exists
    const existingSession = await ctx.runQuery(internal.auth.getSessionBySessionId, {
      sessionId: args.sessionId,
    });

    // Create or update session
    const now = Date.now();

    if (existingSession) {
      // Update existing session to point to the user
      await ctx.runMutation(internal.auth.updateSession, {
        sessionId: existingSession._id,
        userId: user._id,
        authMethod: 'recovery_code',
      });
    } else {
      // Create a new session
      await ctx.runMutation(internal.auth.createSession, {
        sessionId: args.sessionId,
        userId: user._id,
        createdAt: now,
        authMethod: 'recovery_code',
      });
    }

    return {
      success: true,
      user,
    };
  },
});

/**
 * Regenerates a new recovery code for the current user, invalidating the old one.
 */
export const regenerateRecoveryCode = action({
  args: { ...SessionIdArg },
  handler: async (
    ctx: ActionCtx,
    args: { sessionId: string }
  ): Promise<{ success: boolean; recoveryCode?: string; reason?: string }> => {
    // Check if login is disabled
    if (featureFlags.disableLogin) {
      return {
        success: false,
        reason: 'feature_disabled',
      };
    }

    // Find the session by sessionId
    const existingSession = await ctx.runQuery(internal.auth.getSessionBySessionId, {
      sessionId: args.sessionId,
    });

    if (!existingSession || !existingSession.userId) {
      return { success: false, reason: 'not_authenticated' };
    }

    // Get the user
    const user = await ctx.runQuery(internal.auth.getUserById, {
      userId: existingSession.userId,
    });

    if (!user) {
      return { success: false, reason: 'user_not_found' };
    }

    // Generate a new recovery code using the crypto action
    const code: string = await ctx.runAction(api.crypto.generateRecoveryCode, { length: 128 });
    await ctx.runMutation(internal.auth.updateUserRecoveryCode, {
      userId: existingSession.userId,
      recoveryCode: code,
    });

    return { success: true, recoveryCode: code };
  },
});

/**
 * Internal query to retrieve a session by its sessionId.
 */
export const getSessionBySessionId = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args): Promise<Doc<'sessions'> | null> => {
    return await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();
  },
});

/**
 * Internal query to retrieve a user by their ID.
 */
export const getUserById = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args): Promise<Doc<'users'> | null> => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Internal query to find a user by their recovery code.
 */
export const getUserByRecoveryCode = internalQuery({
  args: { recoveryCode: v.string() },
  handler: async (ctx, args): Promise<Doc<'users'> | null> => {
    return await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('recoveryCode'), args.recoveryCode))
      .first();
  },
});

/**
 * Internal mutation to add or update a recovery code on a user.
 */
export const updateUserRecoveryCode = internalMutation({
  args: { userId: v.id('users'), recoveryCode: v.string() },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.userId, { recoveryCode: args.recoveryCode });
  },
});

/**
 * Internal mutation to create a new session for a user.
 */
export const createSession = internalMutation({
  args: {
    sessionId: v.string(),
    userId: v.id('users'),
    createdAt: v.number(),
    authMethod: v.optional(
      v.union(
        v.literal('google'),
        v.literal('login_code'),
        v.literal('recovery_code'),
        v.literal('anonymous'),
        v.literal('username_password')
      )
    ),
  },
  handler: async (ctx, args): Promise<Id<'sessions'>> => {
    return await ctx.db.insert('sessions', {
      sessionId: args.sessionId,
      userId: args.userId,
      createdAt: args.createdAt,
      authMethod: args.authMethod,
    });
  },
});

/**
 * Internal mutation to update an existing session with a new user.
 */
export const updateSession = internalMutation({
  args: {
    sessionId: v.id('sessions'),
    userId: v.id('users'),
    authMethod: v.optional(
      v.union(
        v.literal('google'),
        v.literal('login_code'),
        v.literal('recovery_code'),
        v.literal('anonymous'),
        v.literal('username_password')
      )
    ),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.sessionId, {
      userId: args.userId,
      authMethod: args.authMethod,
    });
  },
});

/**
 * Generates a random anonymous username from predefined adjectives and nouns.
 */
function _generateAnonUsername(): string {
  const adjectives = [
    'Happy',
    'Curious',
    'Cheerful',
    'Bright',
    'Calm',
    'Eager',
    'Gentle',
    'Honest',
    'Kind',
    'Lively',
    'Polite',
    'Proud',
    'Silly',
    'Witty',
    'Brave',
  ];

  const nouns = [
    'Penguin',
    'Tiger',
    'Dolphin',
    'Eagle',
    'Koala',
    'Panda',
    'Fox',
    'Wolf',
    'Owl',
    'Rabbit',
    'Lion',
    'Bear',
    'Deer',
    'Hawk',
    'Turtle',
  ];

  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000);

  return `${randomAdjective}${randomNoun}${randomNumber}`;
}

// ============================================================================
// BACKWARD COMPATIBILITY FUNCTIONS (for app migration)
// ============================================================================

/**
 * Creates an anonymous session and returns the session ID.
 * This is a backward-compatible function for the app's existing code that expects
 * to receive a session ID directly from the mutation.
 *
 * @deprecated Use loginAnon with a client-provided sessionId for new code.
 */
export const useAnonymousSession = mutation({
  args: {
    sessionId: v.optional(v.union(v.id('sessions'), v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { sessionId: prevSessionId } = args;

    // Check if an existing session ID was provided and is still valid
    if (prevSessionId && typeof prevSessionId === 'string') {
      // Try to find by _id if it looks like a Convex ID
      try {
        const prevSession = await ctx.db.get(prevSessionId as Id<'sessions'>);
        if (prevSession?.userId) {
          // Update lastActiveAt for existing session
          await ctx.db.patch(prevSessionId as Id<'sessions'>, {
            createdAt: Date.now(),
          });
          return prevSessionId as Id<'sessions'>;
        }
      } catch {
        // Not a valid session ID, continue to create new session
      }
    }

    // Create an anonymous user
    const displayName = `anonymous${Math.random().toString(36).substring(2, 15)}`;
    const userId = await ctx.db.insert('users', {
      type: 'anonymous',
      name: displayName,
      accessLevel: 'user',
    });

    // Create a new session
    const sessionId = await ctx.db.insert('sessions', {
      userId,
      createdAt: Date.now(),
      authMethod: 'anonymous',
    });

    return sessionId;
  },
});

/**
 * Gets the user associated with a session.
 * This is a backward-compatible query for code that needs to look up a user by session ID.
 */
export const getUser = query({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }
    const user = await ctx.db.get(session.userId);
    return user;
  },
});

/**
 * Exchanges an old session ID (document _id) for a new session ID (UUID string).
 * This is used to migrate users from the old goals-session-id localStorage format
 * to the new sessionId format used by the template.
 *
 * Logic:
 * 1. If no newSessionId provided: look up old session, generate and return a new sessionId
 * 2. If newSessionId provided: check if both sessions belong to the same user
 *    - Same user: return the provided newSessionId
 *    - Different user: create new sessionId linked to user from old session
 *
 * @param oldSessionId - The old session document _id from goals-session-id localStorage
 * @param newSessionId - Optional: the new UUID sessionId to check/use
 * @returns Object with success status and the sessionId
 */
export const exchangeSession = mutation({
  args: {
    oldSessionId: v.string(),
    newSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { oldSessionId, newSessionId } = args;

    // Try to find the old session by document _id
    let oldSession: Doc<'sessions'> | null = null;
    try {
      oldSession = await ctx.db.get(oldSessionId as Id<'sessions'>);
    } catch {
      // Invalid ID format
      return { success: false, reason: 'invalid_session_id' };
    }

    if (!oldSession) {
      return { success: false, reason: 'session_not_found' };
    }

    // If the old session already has a sessionId string, return it
    if (oldSession.sessionId) {
      return { success: true, sessionId: oldSession.sessionId };
    }

    // Case 1: No newSessionId provided - generate one and assign to old session
    if (!newSessionId) {
      const generatedSessionId = crypto.randomUUID();
      await ctx.db.patch(oldSessionId as Id<'sessions'>, {
        sessionId: generatedSessionId,
        createdAt: oldSession.createdAt || Date.now(),
        authMethod: oldSession.authMethod || 'anonymous',
      });
      return { success: true, sessionId: generatedSessionId };
    }

    // Case 2: newSessionId provided - check if it belongs to the same user
    const newSession = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', newSessionId))
      .first();

    if (!newSession) {
      // New session doesn't exist yet, assign the newSessionId to old session
      await ctx.db.patch(oldSessionId as Id<'sessions'>, {
        sessionId: newSessionId,
        createdAt: oldSession.createdAt || Date.now(),
        authMethod: oldSession.authMethod || 'anonymous',
      });
      return { success: true, sessionId: newSessionId };
    }

    // Both sessions exist - check if they belong to the same user
    if (newSession.userId === oldSession.userId) {
      // Same user, return the newSessionId (already using new format)
      return { success: true, sessionId: newSessionId };
    }

    // Different users - update old session with a new sessionId to preserve old user
    const generatedSessionId = crypto.randomUUID();
    await ctx.db.patch(oldSessionId as Id<'sessions'>, {
      sessionId: generatedSessionId,
      createdAt: oldSession.createdAt || Date.now(),
      authMethod: oldSession.authMethod || 'anonymous',
    });
    return { success: true, sessionId: generatedSessionId };
  },
});
