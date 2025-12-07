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

/**
 * Database schema definition for the Goals application.
 * Combines template infrastructure tables with app-specific goal management tables.
 */
export default defineSchema({
  // ============================================================================
  // TEMPLATE INFRASTRUCTURE TABLES (from upstream)
  // ============================================================================

  /**
   * Application metadata and version tracking.
   */
  appInfo: defineTable({
    latestVersion: v.string(),
  }),

  /**
   * Presentation state management for real-time presentation controls.
   * Tracks current slide and active presenter information.
   */
  presentationState: defineTable({
    key: v.string(),
    currentSlide: v.number(),
    lastUpdated: v.number(),
    activePresentation: v.optional(
      v.object({
        presenterId: v.string(),
      })
    ),
  }).index('by_key', ['key']),

  /**
   * Discussion state management for collaborative discussions.
   */
  discussionState: defineTable({
    key: v.string(),
    title: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    conclusions: v.optional(
      v.array(
        v.object({
          text: v.string(),
          tags: v.array(v.string()),
        })
      )
    ),
    concludedAt: v.optional(v.number()),
    concludedBy: v.optional(v.string()),
  }).index('by_key', ['key']),

  /**
   * Individual messages within discussions.
   */
  discussionMessages: defineTable({
    discussionKey: v.string(),
    name: v.string(),
    message: v.string(),
    timestamp: v.number(),
    sessionId: v.optional(v.string()),
  }).index('by_discussion', ['discussionKey']),

  /**
   * Checklist state management for collaborative task tracking.
   */
  checklistState: defineTable({
    key: v.string(),
    title: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    concludedAt: v.optional(v.number()),
    concludedBy: v.optional(v.string()),
  }).index('by_key', ['key']),

  /**
   * Individual items within checklists.
   */
  checklistItems: defineTable({
    checklistKey: v.string(),
    text: v.string(),
    isCompleted: v.boolean(),
    order: v.number(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    createdBy: v.optional(v.string()),
    completedBy: v.optional(v.string()),
  })
    .index('by_checklist', ['checklistKey'])
    .index('by_checklist_order', ['checklistKey', 'order']),

  /**
   * Attendance tracking for events and meetings.
   */
  attendanceRecords: defineTable({
    attendanceKey: v.string(),
    timestamp: v.number(),
    userId: v.optional(v.id('users')),
    name: v.optional(v.string()),
    status: v.optional(v.union(v.literal('attending'), v.literal('not_attending'))),
    reason: v.optional(v.string()),
    remarks: v.optional(v.string()),
    isManuallyJoined: v.optional(v.boolean()),
  })
    .index('by_attendance', ['attendanceKey'])
    .index('by_name_attendance', ['attendanceKey', 'name'])
    .index('by_user_attendance', ['attendanceKey', 'userId']),

  // ============================================================================
  // AUTH TABLES (from template with app extensions)
  // ============================================================================

  /**
   * User accounts supporting authenticated, anonymous, and Google OAuth users.
   * Extended to support both template and app user types.
   */
  users: defineTable(
    v.union(
      // Template full user type
      v.object({
        type: v.literal('full'),
        name: v.string(),
        username: v.optional(v.string()),
        email: v.string(),
        recoveryCode: v.optional(v.string()),
        accessLevel: v.optional(v.union(v.literal('user'), v.literal('system_admin'))),
        google: v.optional(
          v.object({
            id: v.string(),
            email: v.string(),
            verified_email: v.optional(v.boolean()),
            name: v.string(),
            given_name: v.optional(v.string()),
            family_name: v.optional(v.string()),
            picture: v.optional(v.string()),
            locale: v.optional(v.string()),
            hd: v.optional(v.string()),
          })
        ),
      }),
      // Template anonymous user type
      v.object({
        type: v.literal('anonymous'),
        name: v.string(),
        recoveryCode: v.optional(v.string()),
        accessLevel: v.optional(v.union(v.literal('user'), v.literal('system_admin'))),
      }),
      // App user type (for existing app data compatibility)
      v.object({
        type: v.literal('user'),
        email: v.string(),
        name: v.string(),
        displayName: v.string(),
      })
    )
  )
    .index('by_username', ['username'])
    .index('by_email', ['email'])
    .index('by_name', ['name'])
    .index('by_googleId', ['google.id']),

  /**
   * User sessions for authentication and state management.
   * Combined schema supporting both template and app session types.
   */
  sessions: defineTable({
    sessionId: v.optional(v.string()), // Template style - client-provided session ID
    userId: v.id('users'),
    createdAt: v.optional(v.number()),
    status: v.optional(v.literal('active')), // App style status
    lastActiveAt: v.optional(v.number()), // App style activity tracking
    authMethod: v.optional(
      v.union(
        v.literal('google'),
        v.literal('login_code'),
        v.literal('recovery_code'),
        v.literal('anonymous'),
        v.literal('username_password')
      )
    ),
    expiresAt: v.optional(v.number()), // DEPRECATED
    expiresAtLabel: v.optional(v.string()), // DEPRECATED
  }).index('by_sessionId', ['sessionId']),

  /**
   * Temporary login codes for cross-device authentication.
   */
  loginCodes: defineTable({
    code: v.string(),
    userId: v.id('users'),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index('by_code', ['code']),

  /**
   * Authentication provider configuration.
   */
  auth_providerConfigs: defineTable({
    type: v.union(v.literal('google')),
    enabled: v.boolean(),
    projectId: v.optional(v.string()),
    clientId: v.optional(v.string()),
    clientSecret: v.optional(v.string()),
    redirectUris: v.array(v.string()),
    configuredBy: v.id('users'),
    configuredAt: v.number(),
  }).index('by_type', ['type']),

  /**
   * Login requests for authentication provider flows.
   */
  auth_loginRequests: defineTable({
    sessionId: v.string(),
    status: v.union(v.literal('pending'), v.literal('completed'), v.literal('failed')),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    provider: v.union(v.literal('google')),
    expiresAt: v.number(),
    redirectUri: v.string(),
  }),

  /**
   * Connect requests for authentication provider account linking flows.
   */
  auth_connectRequests: defineTable({
    sessionId: v.string(),
    status: v.union(v.literal('pending'), v.literal('completed'), v.literal('failed')),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    provider: v.union(v.literal('google')),
    expiresAt: v.number(),
    redirectUri: v.string(),
  }),

  // ============================================================================
  // APP-SPECIFIC TABLES (Goals application)
  // ============================================================================

  /**
   * Domains for categorizing goals.
   */
  domains: defineTable({
    userId: v.id('users'),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  }).index('by_user', ['userId']),

  /**
   * Goals table - the core of the application.
   * Supports quarterly, weekly, daily, and adhoc goals with hierarchical structure.
   */
  goals: defineTable({
    // Partition
    userId: v.id('users'),
    year: v.number(),
    quarter: v.number(),

    // Data
    title: v.string(),
    details: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    domainId: v.optional(v.id('domains')),
    parentId: v.optional(v.id('goals')),
    inPath: v.string(),
    depth: v.number(),
    carryOver: v.optional(carryOverSchema),
    isComplete: v.boolean(),
    completedAt: v.optional(v.number()),

    // Adhoc goal fields
    adhoc: v.optional(
      v.object({
        weekNumber: v.number(),
        dueDate: v.optional(v.number()),
      })
    ),
  })
    .index('by_user_and_year_and_quarter', ['userId', 'year', 'quarter'])
    .index('by_user_and_year_and_quarter_and_parent', ['userId', 'year', 'quarter', 'parentId'])
    .index('by_user_and_adhoc_year_week', ['userId', 'year', 'adhoc.weekNumber'])
    .index('by_user_and_domain', ['userId', 'domainId']),

  /**
   * Time series data for goal state snapshots by week.
   */
  goalStateByWeek: defineTable({
    // Partition
    userId: v.id('users'),
    year: v.number(),
    quarter: v.number(),

    // Data
    goalId: v.id('goals'),
    weekNumber: v.number(),
    isStarred: v.boolean(),
    isPinned: v.boolean(),
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
    carryOver: v.optional(carryOverSchema),
  })
    .index('by_user', ['userId'])
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

  /**
   * Sync sessions for data synchronization.
   */
  syncSessions: defineTable({
    userId: v.id('users'),
    passphrase: v.string(),
    expiresAt: v.number(),
    status: v.union(v.literal('active'), v.literal('consumed')),
    durationMs: v.optional(v.number()),
  }).index('by_passphrase', ['passphrase']),

  /**
   * Fire goals - priority/urgent goals.
   */
  fireGoals: defineTable({
    userId: v.id('users'),
    goalId: v.id('goals'),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_goal', ['userId', 'goalId']),

  /**
   * Pending goals - goals awaiting action with descriptions.
   */
  pendingGoals: defineTable({
    userId: v.id('users'),
    goalId: v.id('goals'),
    description: v.string(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_goal', ['userId', 'goalId']),

  /**
   * Adhoc goal states - completion status for adhoc goals by week.
   */
  adhocGoalStates: defineTable({
    userId: v.id('users'),
    goalId: v.id('goals'),
    year: v.number(),
    weekNumber: v.number(),
    isComplete: v.boolean(),
    completedAt: v.optional(v.number()),
  })
    .index('by_user_and_year_and_week', ['userId', 'year', 'weekNumber'])
    .index('by_user_and_goal', ['userId', 'goalId']),
});
