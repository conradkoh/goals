import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getUser } from './auth';
import { internal } from './_generated/api';
import { ConvexError } from 'convex/values';

const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  EXPIRED: 'EXPIRED',
  CONSUMED: 'CONSUMED',
} as const;

const SYNC_DURATION_MS = 60 * 1000; // 1 minute in milliseconds

// Consonant and vowel patterns for pronounceable words
const CONSONANTS = 'bcdfghjklmnprstvwxz';
const VOWELS = 'aeiouy';
const CONSONANT_PAIRS = [
  'bl',
  'br',
  'ch',
  'cl',
  'cr',
  'dr',
  'fl',
  'fr',
  'gl',
  'gr',
  'pl',
  'pr',
  'sc',
  'sh',
  'sk',
  'sl',
  'sm',
  'sn',
  'sp',
  'st',
  'sw',
  'th',
  'tr',
  'tw',
  'wh',
];
const ENDINGS = ['ng', 'nt', 'st', 'th', 'ch', 'sh', 'le', 'er', 'ar', 'or'];

/**
 * Generates a random pronounceable word between 4 and 8 characters
 */
function generateWord(): string {
  const minLength = 4;
  const maxLength = 8;
  const targetLength =
    Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;

  const getRandomChar = (str: string) =>
    str[Math.floor(Math.random() * str.length)];
  const getRandomItem = <T>(arr: T[]) =>
    arr[Math.floor(Math.random() * arr.length)];

  let word = '';
  let isLastCharVowel = false;

  // Start with either a consonant pair or single consonant (70% chance for single)
  if (Math.random() < 0.7) {
    word += getRandomChar(CONSONANTS);
  } else {
    word += getRandomItem(CONSONANT_PAIRS);
  }

  // Build the middle of the word
  while (word.length < targetLength - 2) {
    if (isLastCharVowel) {
      // After a vowel, add either a consonant or consonant pair
      if (Math.random() < 0.8 || word.length > targetLength - 3) {
        word += getRandomChar(CONSONANTS);
      } else {
        word += getRandomItem(CONSONANT_PAIRS);
      }
      isLastCharVowel = false;
    } else {
      // After a consonant, add a vowel
      word += getRandomChar(VOWELS);
      isLastCharVowel = true;
    }
  }

  // Add an ending if there's room, otherwise finish with a vowel or consonant
  if (word.length <= targetLength - 2 && Math.random() < 0.3) {
    word += getRandomItem(ENDINGS);
  } else {
    if (!isLastCharVowel) {
      word += getRandomChar(VOWELS);
    } else {
      word += getRandomChar(CONSONANTS);
    }
  }

  return word;
}

function generatePassphrase(): string {
  const segments = [generateWord(), generateWord(), generateWord()];
  return segments.join('-');
}

/**
 * Normalizes a passphrase for consistent comparison
 * Converts to lowercase and ensures proper hyphenation
 */
function normalizePassphrase(passphrase: string): string {
  return passphrase.toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * Creates a new sync session with a generated passphrase
 */
export const createSyncSession = mutation({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx, { sessionId: args.sessionId });
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Update session's lastActiveAt
    await ctx.db.patch(args.sessionId, {
      lastActiveAt: Date.now(),
    });

    // Delete any existing sync sessions for this user
    const existingSessions = await ctx.db
      .query('syncSessions')
      .filter((q) => q.eq(q.field('userId'), user._id))
      .collect();

    await Promise.all(
      existingSessions.map((session) => ctx.db.delete(session._id))
    );

    // Create new sync session that expires in 1 minute
    const expiresAt = Date.now() + SYNC_DURATION_MS;
    const passphrase = normalizePassphrase(generatePassphrase());
    return await ctx.db.insert('syncSessions', {
      userId: user._id,
      passphrase,
      expiresAt,
      status: 'active',
      durationMs: SYNC_DURATION_MS, // Add duration to the session data
    });
  },
});

/**
 * Gets the current sync session for a user
 */
export const getCurrentSyncSession = query({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx, { sessionId: args.sessionId });
    if (!user) {
      throw new Error('Not authenticated');
    }

    const syncSession = await ctx.db
      .query('syncSessions')
      .filter((q) => q.eq(q.field('userId'), user._id))
      .first();

    // If no session exists or it's expired, return null
    // The frontend will handle creating a new session
    if (!syncSession || syncSession.expiresAt < Date.now()) {
      return null;
    }

    return syncSession;
  },
});

/**
 * Validates a passphrase and returns the associated user session
 */
export const validatePassphrase = mutation({
  args: {
    passphrase: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedPassphrase = normalizePassphrase(args.passphrase);

    // Find the sync session with this passphrase
    const syncSession = await ctx.db
      .query('syncSessions')
      .withIndex('by_passphrase', (q) =>
        q.eq('passphrase', normalizedPassphrase)
      )
      .first();

    if (!syncSession) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: 'Invalid sync code. Please check the code and try again.',
      });
    }

    // Check if the session has expired
    if (syncSession.expiresAt < Date.now()) {
      await ctx.db.delete(syncSession._id);
      throw new ConvexError({
        code: ErrorCode.EXPIRED,
        message: 'This sync code has expired. Please use a new code.',
      });
    }

    // Check if the code has already been used
    if (syncSession.status === 'consumed') {
      throw new ConvexError({
        code: ErrorCode.CONSUMED,
        message:
          'This sync code has already been used. Please request a new code.',
      });
    }

    // Create a new session for this user
    const newSession = await ctx.db.insert('sessions', {
      userId: syncSession.userId,
      status: 'active',
      lastActiveAt: Date.now(),
    });

    // Mark the sync session as consumed instead of deleting it
    // This allows the original browser to see that their code was used
    await ctx.db.patch(syncSession._id, {
      status: 'consumed',
    });

    return newSession;
  },
});
