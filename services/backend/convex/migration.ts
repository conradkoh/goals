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
