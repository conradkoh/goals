import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { DayOfWeek } from '../src/constants';

const carryOverSchema = v.object({
  type: v.literal('week'),
  numWeeks: v.number(),
  fromGoal: v.object({
    previousGoalId: v.id('goals'),
    rootGoalId: v.id('goals'),
  }),
});

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
    carryOver: v.optional(carryOverSchema), // Track if this goal was carried over from a previous week
    isComplete: v.optional(v.boolean()), // Whether the goal is complete
    completedAt: v.optional(v.number()), // Unix timestamp when the goal was completed
  }).index('by_user_and_year_and_quarter', ['userId', 'year', 'quarter']),

  // timeseries data for snapshotting
  goalStateByWeek: defineTable({
    //partition
    userId: v.id('users'),
    year: v.number(),
    quarter: v.number(),

    // others
    goalId: v.id('goals'),
    weekNumber: v.number(),
    // quarterly goals
    isStarred: v.boolean(),
    isPinned: v.boolean(),
    // weekly goals
    isComplete: v.boolean(),
    completedAt: v.optional(v.number()), // Unix timestamp when the goal was completed
    // daily goals
    daily: v.optional(
      v.object({
        dayOfWeek: v.union(
          v.literal(DayOfWeek.MONDAY),
          v.literal(DayOfWeek.TUESDAY),
          v.literal(DayOfWeek.WEDNESDAY),
          v.literal(DayOfWeek.THURSDAY),
          v.literal(DayOfWeek.FRIDAY),
          v.literal(DayOfWeek.SATURDAY),
          v.literal(DayOfWeek.SUNDAY)
        ),
        dateTimestamp: v.optional(v.number()),
      })
    ),
    carryOver: v.optional(carryOverSchema), // Track if this goal was carried over from a previous week
  })
    .index('by_user', ['userId']) //TEMP: for migration only
    .index('by_user_and_year_and_quarter_and_week', [
      'userId',
      'year',
      'quarter',
      'weekNumber',
    ])
    .index('by_user_and_goal', ['userId', 'goalId'])
    .index('by_user_and_goal_and_year_and_quarter_and_week', [
      'userId',
      'goalId',
      'year',
      'quarter',
      'weekNumber',
    ])
    .index('by_user_and_year_and_quarter_and_week_and_daily', [
      'userId',
      'year',
      'quarter',
      'weekNumber',
      'daily.dayOfWeek',
      'goalId',
    ]),

  syncSessions: defineTable({
    userId: v.id('users'),
    passphrase: v.string(),
    expiresAt: v.number(), // Unix timestamp
    status: v.union(v.literal('active'), v.literal('consumed')),
    durationMs: v.optional(v.number()), // Duration of the sync session in milliseconds
  }).index('by_passphrase', ['passphrase']),

  fireGoals: defineTable({
    userId: v.id('users'),
    goalId: v.id('goals'),
    createdAt: v.number(), // Unix timestamp
  })
    .index('by_user', ['userId'])
    .index('by_user_and_goal', ['userId', 'goalId']),
});
