import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { z } from 'zod';
import { zodToConvex } from 'convex-helpers/server/zod';

export default defineSchema({
  sessions: defineTable({
    userId: v.id('users'),
    status: v.literal('active'),
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
    isStarred: v.boolean(),
    isPinned: v.boolean(),
    isComplete: v.boolean(),
  }).index('by_user_and_year_and_quarter_and_week', [
    'userId',
    'year',
    'quarter',
    'weekNumber',
  ]),
});
