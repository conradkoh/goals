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
    await ctx.db.patch('sessions', args.sessionId, {
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
    const user = await ctx.db.get('users', args.userId);
    if (!user) {
      return;
    }

    if (user.accessLevel === undefined) {
      await ctx.db.patch('users', args.userId, {
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
        ctx.db.patch('users', user._id, {
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

        await ctx.db.patch('goals', goal._id, {
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
        await ctx.db.patch('goals', goal._id, {
          year: correctYear,
        });

        const state = await ctx.db
          .query('adhocGoalStates')
          .withIndex('by_user_and_goal', (q) => q.eq('userId', goal.userId).eq('goalId', goal._id))
          .first();

        if (state) {
          await ctx.db.patch('adhocGoalStates', state._id, {
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

        await ctx.db.patch('goals', goal._id, {
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
        await ctx.db.patch('adhocGoalStates', state._id, {
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
        await ctx.db.patch('adhocGoalStates', state._id, {
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
// USER SCHEMA COMPATIBILITY MIGRATIONS (COMPLETED)
// ============================================================================
// The following migrations have been completed and removed:
// - normalizeAnonymousUserNames: Migrated displayName -> name for anonymous users
// - removeAnonymousUserDisplayName: Removed displayName field from anonymous users
//
// The displayName field has been fully removed from the schema.

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
          await ctx.db.patch('goals', goal._id, {
            domainId: adhocWithDomainId.domainId,
          });
          console.log(`Copied adhoc.domainId to root domainId for goal ${goal._id}`);
        }

        const { domainId: _removedDomainId, ...adhocWithoutDomainId } = adhocWithDomainId;

        await ctx.db.patch('goals', goal._id, {
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
