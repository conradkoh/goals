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

  domains: defineTable({
    userId: v.id('users'),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  }).index('by_user', ['userId']),

  goals: defineTable({
    //partition
    userId: v.id('users'),
    year: v.number(),
    quarter: v.number(),

    //data
    title: v.string(),
    details: v.optional(v.string()), // Rich text content for the goal
    dueDate: v.optional(v.number()), // Unix timestamp for due date
    domainId: v.optional(v.id('domains')), // Domain for categorization (primarily for adhoc goals)
    parentId: v.optional(v.id('goals')),
    inPath: v.string(), //recursive structure
    depth: v.number(), // 0 for quarterly, 1 for weekly, 2 for daily
    carryOver: v.optional(carryOverSchema), // Track if this goal was carried over from a previous week
    isComplete: v.boolean(), // Whether the goal is complete
    completedAt: v.optional(v.number()), // Unix timestamp when the goal was completed

    // Adhoc goal fields - grouped into optional object
    adhoc: v.optional(
      v.object({
        domainId: v.optional(v.id('domains')), // DEPRECATED: Use goal.domainId instead (kept for backward compatibility)
        year: v.optional(v.number()), // DEPRECATED: Use goal.year instead - will be removed in future version
        weekNumber: v.number(), // ISO week number (1-53)
        dayOfWeek: v.optional(
          v.union(
            v.literal(DayOfWeek.MONDAY),
            v.literal(DayOfWeek.TUESDAY),
            v.literal(DayOfWeek.WEDNESDAY),
            v.literal(DayOfWeek.THURSDAY),
            v.literal(DayOfWeek.FRIDAY),
            v.literal(DayOfWeek.SATURDAY),
            v.literal(DayOfWeek.SUNDAY)
          )
        ),
        dueDate: v.optional(v.number()), // Optional specific due date (Unix timestamp)
      })
    ),
  })
    .index('by_user_and_year_and_quarter', ['userId', 'year', 'quarter'])
    .index('by_user_and_year_and_quarter_and_parent', ['userId', 'year', 'quarter', 'parentId'])
    .index('by_user_and_adhoc_year_week', ['userId', 'year', 'adhoc.weekNumber'])
    .index('by_user_and_domain', ['userId', 'domainId']),

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
    .index('by_user_and_year_and_quarter_and_week', ['userId', 'year', 'quarter', 'weekNumber'])
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

  pendingGoals: defineTable({
    userId: v.id('users'),
    goalId: v.id('goals'),
    description: v.string(), // Description explaining why the goal is pending
    createdAt: v.number(), // Unix timestamp when status was set
  })
    .index('by_user', ['userId'])
    .index('by_user_and_goal', ['userId', 'goalId']),

  adhocGoalStates: defineTable({
    userId: v.id('users'),
    goalId: v.id('goals'),
    year: v.number(),
    weekNumber: v.number(), // ISO week number
    dayOfWeek: v.optional(
      v.union(
        v.literal(DayOfWeek.MONDAY),
        v.literal(DayOfWeek.TUESDAY),
        v.literal(DayOfWeek.WEDNESDAY),
        v.literal(DayOfWeek.THURSDAY),
        v.literal(DayOfWeek.FRIDAY),
        v.literal(DayOfWeek.SATURDAY),
        v.literal(DayOfWeek.SUNDAY)
      )
    ),
    isComplete: v.boolean(),
    completedAt: v.optional(v.number()),
  })
    .index('by_user_and_year_and_week', ['userId', 'year', 'weekNumber'])
    .index('by_user_and_goal', ['userId', 'goalId'])
    .index('by_user_and_year_and_week_and_day', ['userId', 'year', 'weekNumber', 'dayOfWeek']),
});
