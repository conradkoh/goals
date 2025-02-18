import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { z } from 'zod';
import { zodToConvex } from 'convex-helpers/server/zod';

export default defineSchema({
  sessions: defineTable({
    userId: v.id('users'),
    status: v.literal('active'),
    lastActiveAt: v.optional(v.number()), // Unix timestamp
  }),
  users: defineTable(
    v.union(
      v.object({
        type: v.literal('user'),
        email: v.string(),
        name: v.string(),
        displayName: v.string(),
      }),
      v.object({
        type: v.literal('anonymous'),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        displayName: v.optional(v.string()),
      })
    )
  ),

  goals: defineTable({
    //partition
    userId: v.id('users'),
    year: v.number(),
    quarter: v.number(),

    //data
    title: v.string(),
    details: v.optional(v.string()), // Rich text content for the goal
    parentId: v.optional(v.id('goals')),
    inPath: v.string(), //recursive structure
    depth: v.number(), // 0 for quarterly, 1 for weekly, 2 for daily
  }).index('by_user_and_year_and_quarter', ['userId', 'year', 'quarter']),

  // timeseries data for snapshotting
  goalsWeekly: defineTable({
    //partition
    userId: v.id('users'),
    year: v.number(),
    quarter: v.number(),

    // others
    goalId: v.id('goals'),
    weekNumber: v.number(),
    progress: v.string(),
    // quarterly goals
    isStarred: v.boolean(),
    isPinned: v.boolean(),
    // weekly goals
    isComplete: v.boolean(),
    // daily goals
    daily: v.optional(
      v.object({
        dayOfWeek: v.number(),
        dateTimestamp: v.optional(v.number()),
      })
    ),
  }).index('by_user_and_year_and_quarter_and_week', [
    'userId',
    'year',
    'quarter',
    'weekNumber',
  ]),

  syncSessions: defineTable({
    userId: v.id('users'),
    passphrase: v.string(),
    expiresAt: v.number(), // Unix timestamp
    status: v.union(v.literal('active'), v.literal('consumed')),
    durationMs: v.optional(v.number()), // Duration of the sync session in milliseconds
  }).index('by_passphrase', ['passphrase']),
});
