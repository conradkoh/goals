import { internalMutation } from './_generated/server';

/**
 * Migration: Remove deprecated adhoc.year field from all adhoc goals
 *
 * This migration removes the redundant adhoc.year field from all adhoc goals.
 * The year information is now stored in the root goal.year field instead.
 *
 * Run this migration once to clean up existing data:
 * ```
 * npx convex run migration:removeAdhocYearField
 * ```
 */
export const removeAdhocYearField = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Query all goals that have the adhoc object
    const adhocGoals = await ctx.db
      .query('goals')
      .filter((q) => q.neq(q.field('adhoc'), undefined))
      .collect();

    console.log(`Found ${adhocGoals.length} adhoc goals to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    // Update each adhoc goal to remove the year field
    for (const goal of adhocGoals) {
      if (goal.adhoc && 'year' in goal.adhoc) {
        // Remove the year field from adhoc object
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
 *
 * This migration ensures that all adhoc goals have the correct year in the root goal.year field
 * based on their week number. This fixes any goals that were created with incorrect years.
 *
 * Run this migration after removeAdhocYearField:
 * ```
 * npx convex run migration:fixAdhocGoalYears
 * ```
 */
export const fixAdhocGoalYears = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Query all adhoc goals
    const adhocGoals = await ctx.db
      .query('goals')
      .filter((q) => q.neq(q.field('adhoc'), undefined))
      .collect();

    console.log(`Found ${adhocGoals.length} adhoc goals to check`);

    let fixedCount = 0;
    let correctCount = 0;

    // Get current year for reference
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentWeekNumber =
      Math.floor(
        (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
      ) + 1;

    for (const goal of adhocGoals) {
      if (!goal.adhoc) continue;

      const weekNumber = goal.adhoc.weekNumber;
      let correctYear = goal.year; // Start with current year

      // Apply the same logic as in createAdhocGoal
      if (weekNumber > 50 && currentWeekNumber < 10) {
        // Week 51-53 when we're in weeks 1-9 means it's from previous year
        correctYear = currentYear - 1;
      } else if (weekNumber < 10 && currentWeekNumber > 50) {
        // Week 1-9 when we're in weeks 51-53 means it's from next year
        correctYear = currentYear + 1;
      } else {
        correctYear = currentYear;
      }

      if (goal.year !== correctYear) {
        await ctx.db.patch(goal._id, {
          year: correctYear,
        });

        // Also update the adhocGoalStates if it exists
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
 *
 * This migration removes the deprecated dayOfWeek field from adhoc goals.
 * Adhoc tasks are now week-level only, not day-level.
 *
 * Run this migration to clean up existing data:
 * ```
 * npx convex run migration:removeAdhocDayOfWeekField
 * ```
 */
export const removeAdhocDayOfWeekField = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Query all goals with adhoc object
    const adhocGoals = await ctx.db
      .query('goals')
      .filter((q) => q.neq(q.field('adhoc'), undefined))
      .collect();

    console.log(`Found ${adhocGoals.length} adhoc goals to check`);

    let goalsUpdated = 0;
    let goalsSkipped = 0;
    let statesUpdated = 0;
    let statesSkipped = 0;

    // Update each adhoc goal to remove the dayOfWeek field
    for (const goal of adhocGoals) {
      if (goal.adhoc && 'dayOfWeek' in goal.adhoc) {
        // Remove the dayOfWeek field from adhoc object
        const { dayOfWeek: _removedDayOfWeek, ...adhocWithoutDayOfWeek } = goal.adhoc;

        await ctx.db.patch(goal._id, {
          adhoc: adhocWithoutDayOfWeek,
        });

        goalsUpdated++;
      } else {
        goalsSkipped++;
      }

      // Also update adhocGoalStates to remove dayOfWeek
      const state = await ctx.db
        .query('adhocGoalStates')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', goal.userId).eq('goalId', goal._id))
        .first();

      if (state && 'dayOfWeek' in state) {
        // Remove dayOfWeek from state by explicitly setting it to undefined
        await ctx.db.patch(state._id, {
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
 *
 * This is a comprehensive migration that processes all adhocGoalStates,
 * not just those linked to current adhoc goals (in case there are orphaned states).
 *
 * Run this migration to ensure all adhocGoalStates are clean:
 * ```
 * npx convex run migration:removeAllAdhocGoalStatesDayOfWeek
 * ```
 */
export const removeAllAdhocGoalStatesDayOfWeek = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Query ALL adhocGoalStates
    const allStates = await ctx.db.query('adhocGoalStates').collect();

    console.log(`Found ${allStates.length} adhoc goal states to check`);

    let statesUpdated = 0;
    let statesSkipped = 0;

    for (const state of allStates) {
      if ('dayOfWeek' in state) {
        // Remove dayOfWeek from state by explicitly setting it to undefined
        await ctx.db.patch(state._id, {
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

/**
 * Migration: Remove deprecated adhoc.domainId field from all adhoc goals
 *
 * This migration removes the deprecated domainId field from adhoc goals.
 * The domainId should be stored at the root goal.domainId level, not in the adhoc object.
 *
 * Run this migration to clean up existing data:
 * ```
 * npx convex run migration:removeAdhocDomainIdField
 * ```
 */
export const removeAdhocDomainIdField = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Query all goals with adhoc object
    const adhocGoals = await ctx.db
      .query('goals')
      .filter((q) => q.neq(q.field('adhoc'), undefined))
      .collect();

    console.log(`Found ${adhocGoals.length} adhoc goals to check`);

    let goalsUpdated = 0;
    let goalsSkipped = 0;

    // Update each adhoc goal to remove the domainId field
    for (const goal of adhocGoals) {
      if (goal.adhoc && 'domainId' in goal.adhoc) {
        // If adhoc.domainId exists but root domainId doesn't, copy it over first
        if (goal.adhoc.domainId && !goal.domainId) {
          await ctx.db.patch(goal._id, {
            domainId: goal.adhoc.domainId,
          });
          console.log(`Copied adhoc.domainId to root domainId for goal ${goal._id}`);
        }

        // Remove the domainId field from adhoc object
        const { domainId: _removedDomainId, ...adhocWithoutDomainId } = goal.adhoc;

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
