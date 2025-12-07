import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalAction, internalMutation, internalQuery } from './_generated/server';

const BATCH_SIZE = 100; // Process 100 items per batch

interface PaginationOpts {
  numItems: number;
  cursor: string | null;
}

// ============================================================================
// TEMPLATE INFRASTRUCTURE MIGRATIONS (from upstream)
// ============================================================================

/**
 * Internal mutation to remove deprecated expiration fields from a single session.
 * Part of the session expiration deprecation migration.
 */
export const unsetSessionExpiration = internalMutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      expiresAt: undefined,
      expiresAtLabel: undefined,
    });
  },
});

/**
 * Internal action to migrate all sessions by removing deprecated expiration fields.
 * Processes sessions in batches to avoid timeout issues.
 */
export const migrateUnsetSessionExpiration = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const paginationOpts: PaginationOpts = {
      numItems: BATCH_SIZE,
      cursor: args.cursor ?? null,
    };

    const results = await ctx.runQuery(internal.migration.getSessionsBatch, {
      paginationOpts,
    });

    for (const session of results.page) {
      await ctx.runMutation(internal.migration.unsetSessionExpiration, {
        sessionId: session._id,
      });
    }

    if (!results.isDone) {
      await ctx.runAction(internal.migration.migrateUnsetSessionExpiration, {
        cursor: results.continueCursor,
      });
    }
  },
});

/**
 * Helper query to fetch sessions in batches for pagination during migration.
 */
export const getSessionsBatch = internalQuery({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.query('sessions').paginate(args.paginationOpts);
  },
});

/**
 * Internal mutation to set default accessLevel for a user if currently undefined.
 */
export const setUserAccessLevelDefault = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return;
    }

    if (user.accessLevel === undefined) {
      await ctx.db.patch(args.userId, {
        accessLevel: 'user',
      });
    }
  },
});

/**
 * Internal mutation to set all users with undefined accessLevel to 'user' in a single batch.
 */
export const setAllUndefinedAccessLevelsToUser = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query('users').collect();
    const usersToUpdate = allUsers.filter((user) => user.accessLevel === undefined);

    await Promise.all(
      usersToUpdate.map((user) =>
        ctx.db.patch(user._id, {
          accessLevel: 'user',
        })
      )
    );

    console.log(
      `Migration complete: Updated ${usersToUpdate.length} users to accessLevel: 'user' (out of ${allUsers.length} total users)`
    );

    return {
      success: true,
      updatedCount: usersToUpdate.length,
      totalUsers: allUsers.length,
    };
  },
});

/**
 * Internal action to migrate all users to have explicit accessLevel values.
 */
export const migrateUserAccessLevels = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const paginationOpts: PaginationOpts = {
      numItems: BATCH_SIZE,
      cursor: args.cursor ?? null,
    };

    const results = await ctx.runQuery(internal.migration.getUsersBatch, {
      paginationOpts,
    });

    const usersToUpdate = results.page.filter((user) => user.accessLevel === undefined);

    await Promise.all(
      usersToUpdate.map((user) =>
        ctx.runMutation(internal.migration.setUserAccessLevelDefault, {
          userId: user._id,
        })
      )
    );

    console.log(`Processed batch: ${results.page.length} users, updated: ${usersToUpdate.length}`);

    if (!results.isDone) {
      await ctx.runAction(internal.migration.migrateUserAccessLevels, {
        cursor: results.continueCursor,
      });
    } else {
      console.log('User access level migration completed');
    }
  },
});

/**
 * Helper query to fetch users in batches for pagination during migration.
 */
export const getUsersBatch = internalQuery({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.query('users').paginate(args.paginationOpts);
  },
});

// ============================================================================
// APP-SPECIFIC MIGRATIONS (Goals application)
// ============================================================================

/**
 * Migration: Remove deprecated adhoc.year field from all adhoc goals
 */
export const removeAdhocYearField = internalMutation({
  args: {},
  handler: async (ctx) => {
    const adhocGoals = await ctx.db
      .query('goals')
      .filter((q) => q.neq(q.field('adhoc'), undefined))
      .collect();

    console.log(`Found ${adhocGoals.length} adhoc goals to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const goal of adhocGoals) {
      if (goal.adhoc && 'year' in goal.adhoc) {
        const { year: _removedYear, ...adhocWithoutYear } = goal.adhoc;

        await ctx.db.patch(goal._id, {
          adhoc: adhocWithoutYear,
        });

        migratedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('Migration complete:');
    console.log(`- Migrated: ${migratedCount} goals`);
    console.log(`- Skipped (already migrated): ${skippedCount} goals`);

    return {
      totalGoals: adhocGoals.length,
      migrated: migratedCount,
      skipped: skippedCount,
    };
  },
});

/**
 * Migration: Ensure all adhoc goals have correct year based on their week number
 */
export const fixAdhocGoalYears = internalMutation({
  args: {},
  handler: async (ctx) => {
    const adhocGoals = await ctx.db
      .query('goals')
      .filter((q) => q.neq(q.field('adhoc'), undefined))
      .collect();

    console.log(`Found ${adhocGoals.length} adhoc goals to check`);

    let fixedCount = 0;
    let correctCount = 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentWeekNumber =
      Math.floor(
        (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
      ) + 1;

    for (const goal of adhocGoals) {
      if (!goal.adhoc) continue;

      const weekNumber = goal.adhoc.weekNumber;
      let correctYear = goal.year;

      if (weekNumber > 50 && currentWeekNumber < 10) {
        correctYear = currentYear - 1;
      } else if (weekNumber < 10 && currentWeekNumber > 50) {
        correctYear = currentYear + 1;
      } else {
        correctYear = currentYear;
      }

      if (goal.year !== correctYear) {
        await ctx.db.patch(goal._id, {
          year: correctYear,
        });

        const state = await ctx.db
          .query('adhocGoalStates')
          .withIndex('by_user_and_goal', (q) => q.eq('userId', goal.userId).eq('goalId', goal._id))
          .first();

        if (state) {
          await ctx.db.patch(state._id, {
            year: correctYear,
          });
        }

        fixedCount++;
        console.log(`Fixed goal ${goal._id}: week ${weekNumber}, ${goal.year} -> ${correctYear}`);
      } else {
        correctCount++;
      }
    }

    console.log('Year fix complete:');
    console.log(`- Fixed: ${fixedCount} goals`);
    console.log(`- Already correct: ${correctCount} goals`);

    return {
      totalGoals: adhocGoals.length,
      fixed: fixedCount,
      alreadyCorrect: correctCount,
    };
  },
});

/**
 * Migration: Remove deprecated adhoc.dayOfWeek field from all adhoc goals
 */
export const removeAdhocDayOfWeekField = internalMutation({
  args: {},
  handler: async (ctx) => {
    const adhocGoals = await ctx.db
      .query('goals')
      .filter((q) => q.neq(q.field('adhoc'), undefined))
      .collect();

    console.log(`Found ${adhocGoals.length} adhoc goals to check`);

    let goalsUpdated = 0;
    let goalsSkipped = 0;
    let statesUpdated = 0;
    let statesSkipped = 0;

    for (const goal of adhocGoals) {
      if (goal.adhoc && 'dayOfWeek' in goal.adhoc) {
        const { dayOfWeek: _removedDayOfWeek, ...adhocWithoutDayOfWeek } = goal.adhoc;

        await ctx.db.patch(goal._id, {
          adhoc: adhocWithoutDayOfWeek,
        });

        goalsUpdated++;
      } else {
        goalsSkipped++;
      }

      const state = await ctx.db
        .query('adhocGoalStates')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', goal.userId).eq('goalId', goal._id))
        .first();

      if (state && 'dayOfWeek' in state) {
        await ctx.db.patch(state._id, {
          // @ts-expect-error - dayOfWeek is being removed from schema
          dayOfWeek: undefined,
        });

        statesUpdated++;
      } else if (state) {
        statesSkipped++;
      }
    }

    console.log('Migration complete:');
    console.log('Goals:');
    console.log(`  - Updated: ${goalsUpdated} goals`);
    console.log(`  - Skipped (no dayOfWeek): ${goalsSkipped} goals`);
    console.log('States:');
    console.log(`  - Updated: ${statesUpdated} states`);
    console.log(`  - Skipped (no dayOfWeek): ${statesSkipped} states`);

    return {
      totalGoals: adhocGoals.length,
      goalsUpdated,
      goalsSkipped,
      statesUpdated,
      statesSkipped,
    };
  },
});

/**
 * Migration: Remove dayOfWeek from ALL adhocGoalStates
 */
export const removeAllAdhocGoalStatesDayOfWeek = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allStates = await ctx.db.query('adhocGoalStates').collect();

    console.log(`Found ${allStates.length} adhoc goal states to check`);

    let statesUpdated = 0;
    let statesSkipped = 0;

    for (const state of allStates) {
      if ('dayOfWeek' in state) {
        await ctx.db.patch(state._id, {
          // @ts-expect-error - dayOfWeek is being removed from schema
          dayOfWeek: undefined,
        });

        statesUpdated++;
      } else {
        statesSkipped++;
      }
    }

    console.log('Migration complete:');
    console.log(`  - Updated: ${statesUpdated} states`);
    console.log(`  - Skipped (no dayOfWeek): ${statesSkipped} states`);

    return {
      totalStates: allStates.length,
      statesUpdated,
      statesSkipped,
    };
  },
});

// ============================================================================
// USER SCHEMA COMPATIBILITY MIGRATIONS
// ============================================================================

/**
 * Migration: Normalize anonymous users to use 'name' field instead of 'displayName'
 *
 * BACKGROUND:
 * Old app data has anonymous users with `displayName` field, but the upstream template
 * uses `name` field for anonymous users. This migration copies `displayName` to `name`
 * for all anonymous users that don't have a `name` field.
 *
 * HOW TO RUN:
 * In Convex dashboard or via CLI, run:
 *   await ctx.runMutation(internal.migration.normalizeAnonymousUserNames, {})
 *
 * CLEANUP INSTRUCTIONS (after migration completes successfully):
 * 1. In schema.ts, update the anonymous user type to remove optional displayName:
 *    Change from:
 *      v.object({
 *        type: v.literal('anonymous'),
 *        name: v.optional(v.string()),
 *        displayName: v.optional(v.string()),
 *        recoveryCode: v.optional(v.string()),
 *        accessLevel: v.optional(v.union(v.literal('user'), v.literal('system_admin'))),
 *      }),
 *    Change to:
 *      v.object({
 *        type: v.literal('anonymous'),
 *        name: v.string(),
 *        recoveryCode: v.optional(v.string()),
 *        accessLevel: v.optional(v.union(v.literal('user'), v.literal('system_admin'))),
 *      }),
 *
 * 2. In apps/webapp/src/modules/attendance/components/Attendance.tsx, simplify line ~91:
 *    Change from:
 *      const defaultName = isAuthenticated && currentUser
 *        ? currentUser.name || (currentUser as { displayName?: string }).displayName || ''
 *        : '';
 *    Change to:
 *      const defaultName = isAuthenticated && currentUser ? currentUser.name : '';
 *
 * 3. In apps/webapp/src/modules/profile/NameEditForm.tsx:
 *    a) Remove displayName from _renderUserAvatar parameter type (line ~399):
 *       Change from:
 *         function _renderUserAvatar(user: { type: string; google?: { picture?: string }; name?: string; displayName?: string })
 *       Change to:
 *         function _renderUserAvatar(user: { type: string; google?: { picture?: string }; name: string })
 *
 *    b) Simplify the name display (line ~379):
 *       Change from:
 *         <p className="font-medium">{user.name || (user as { displayName?: string }).displayName || 'Anonymous'}</p>
 *       Change to:
 *         <p className="font-medium">{user.name}</p>
 *
 * 4. After cleanup, delete this migration function from this file.
 */
export const normalizeAnonymousUserNames = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query('users').collect();

    // Filter for anonymous users that have displayName but no name
    const usersToUpdate = allUsers.filter((user) => {
      if (user.type !== 'anonymous') return false;
      const userWithDisplayName = user as { name?: string; displayName?: string };
      return !userWithDisplayName.name && userWithDisplayName.displayName;
    });

    console.log(`Found ${usersToUpdate.length} anonymous users to migrate`);

    let updatedCount = 0;
    for (const user of usersToUpdate) {
      const userWithDisplayName = user as { displayName?: string };
      await ctx.db.patch(user._id, {
        name: userWithDisplayName.displayName,
      });
      updatedCount++;
      console.log(`Updated user ${user._id}: set name = "${userWithDisplayName.displayName}"`);
    }

    console.log(`Migration complete: Updated ${updatedCount} users`);

    return {
      success: true,
      totalUsers: allUsers.length,
      anonymousUsers: allUsers.filter((u) => u.type === 'anonymous').length,
      updatedCount,
    };
  },
});

/**
 * Migration: Remove displayName field from anonymous users after normalizeAnonymousUserNames
 *
 * PREREQUISITE: Run normalizeAnonymousUserNames first!
 *
 * HOW TO RUN:
 * In Convex dashboard or via CLI, run:
 *   await ctx.runMutation(internal.migration.removeAnonymousUserDisplayName, {})
 */
export const removeAnonymousUserDisplayName = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query('users').collect();

    // Filter for anonymous users that still have displayName
    const usersToUpdate = allUsers.filter((user) => {
      if (user.type !== 'anonymous') return false;
      return 'displayName' in user;
    });

    console.log(`Found ${usersToUpdate.length} anonymous users with displayName to clean up`);

    let updatedCount = 0;
    for (const user of usersToUpdate) {
      await ctx.db.patch(user._id, {
        displayName: undefined,
      });
      updatedCount++;
    }

    console.log(`Cleanup complete: Removed displayName from ${updatedCount} users`);

    return {
      success: true,
      updatedCount,
    };
  },
});

/**
 * Migration: Remove deprecated adhoc.domainId field from all adhoc goals
 */
export const removeAdhocDomainIdField = internalMutation({
  args: {},
  handler: async (ctx) => {
    const adhocGoals = await ctx.db
      .query('goals')
      .filter((q) => q.neq(q.field('adhoc'), undefined))
      .collect();

    console.log(`Found ${adhocGoals.length} adhoc goals to check`);

    let goalsUpdated = 0;
    let goalsSkipped = 0;

    for (const goal of adhocGoals) {
      if (goal.adhoc && 'domainId' in goal.adhoc) {
        const adhocWithDomainId = goal.adhoc as {
          domainId?: Id<'domains'>;
          weekNumber: number;
          dueDate?: number;
        };
        if (adhocWithDomainId.domainId && !goal.domainId) {
          await ctx.db.patch(goal._id, {
            domainId: adhocWithDomainId.domainId,
          });
          console.log(`Copied adhoc.domainId to root domainId for goal ${goal._id}`);
        }

        const { domainId: _removedDomainId, ...adhocWithoutDomainId } = adhocWithDomainId;

        await ctx.db.patch(goal._id, {
          adhoc: adhocWithoutDomainId,
        });

        goalsUpdated++;
      } else {
        goalsSkipped++;
      }
    }

    console.log('Migration complete:');
    console.log('Goals:');
    console.log(`  - Updated: ${goalsUpdated} goals`);
    console.log(`  - Skipped (no domainId): ${goalsSkipped} goals`);

    return {
      totalGoals: adhocGoals.length,
      goalsUpdated,
      goalsSkipped,
    };
  },
});
