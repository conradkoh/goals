# Code Review: `feat/quarterly-goal-pull-preview-and-refactoring`

**Branch:** `feat/quarterly-goal-pull-preview-and-refactoring`\
**Base Branch:** `origin/master`\
**Review Date:** December 30, 2025\
**Author:** AI Code Review

**Summary:**

* 7 commits
* 1,216 additions
* 188 deletions
* Changes across backend (Convex functions, use cases) and frontend (React components)

***

## Table of Contents

* [🔴 Critical Issues](#🔴-critical-issues)
* [🟠 High Priority](#🟠-high-priority)
* [🟡 Medium Priority](#🟡-medium-priority)
* [🟢 Low Priority / Improvements](#🟢-low-priority--improvements)
* [✅ Positive Findings](#✅-positive-findings)
* [📊 Summary Metrics](#📊-summary-metrics)
* [🎯 Recommended Next Steps](#🎯-recommended-next-steps)

***

## 🔴 Critical Issues

### 1. Potential Duplicate Goal Migration Bug

**Location:** `services/backend/convex/goal.ts:1264-1267`

**Issue:**

```typescript
} else {
  // No states found, return all weekly goals as fallback
  children = await ctx.db
    .query('goals')
    .withIndex('by_user_and_year_and_quarter_and_parent', ...)
    .collect();
}
```

**Problem:** When `maxWeekResult.maxWeek` is null (no goal states found), the fallback returns ALL weekly goals in the quarter. This defeats the entire purpose of filtering to the "last non-empty week" and could cause massive duplicates if a user clicks the preview/move button multiple times.

**Impact:**

* Preview shows goals that shouldn't be shown
* User expectation mismatch
* Could lead to accidental duplicate goal creation

**Recommendation:** Instead of returning all goals, return empty children or show a specific message that no active goals exist:

```typescript
} else {
  // No weekly goal states found - return empty array
  // This indicates no active weekly goals to preview
  children = [];
}
```

Or add a warning to the frontend to inform the user:

```typescript
return {
  children: [],
  hasActiveGoals: false,
  warning: 'No active weekly goals found for this quarter',
};
```

***

### 2. Missing Database Index for Query Pattern

**Location:** `services/backend/convex/goal.ts:1436-1442`

**Issue:**

```typescript
const allDailyGoalsForWeeklyGoals = await ctx.db
  .query('goals')
  .withIndex('by_user_and_year_and_quarter', (q) =>
    q.eq('userId', userId).eq('year', from.year).eq('quarter', from.quarter)
  )
  .filter((q) => q.eq(q.field('depth'), 2))  // ❌ Filtering after index scan
  .collect();
```

**Problem:** You're filtering by `depth` after the index scan, but you have a composite index `by_user_and_year_and_quarter_and_parent`. Currently this scans ALL goals in the quarter then filters for `depth=2`.

**Performance Impact:** O(n) scan where n = total goals in quarter instead of O(log n) direct lookup.

**Context:** This pattern appears in multiple places:

* Line 1436: Daily goals query in `moveQuarterlyGoal`
* Similar patterns may exist elsewhere

**Recommendation:** Consider one of these approaches:

1. **Add a dedicated index** for `by_user_year_quarter_depth`:
   ```typescript
   // In convex/schema.ts or equivalent
   goals.defineIndex({
     name: "by_user_year_quarter_depth",
     indexBy: "goals",
     fields: ["userId", "year", "quarter", "depth"],
   });
   ```

2. **Use existing index with parent filter** (if applicable):
   ```typescript
   .withIndex('by_user_and_year_and_quarter_and_parent', ...)
   ```

3. **Accept current approach** if goal count per quarter is small (< 1000 goals)

***

### 3. No Tests for New Helper Functions

**Issue:** Created 4 new helper functions without any test coverage:

| Function | Location | Purpose |
|----------|----------|---------|
| `findMaxWeekForQuarterlyGoal` | `services/backend/src/usecase/moveGoalsFromQuarter/findMaxWeekForQuarterlyGoal.ts` | Finds the max week with states for a quarterly goal's children |
| `createGoalWithCarryOver` | `services/backend/src/usecase/goal/create-goal/createGoalWithCarryOver.ts` | Creates a new goal with carry-over metadata |
| `createGoalState` | `services/backend/src/usecase/goal/create-goal/createGoalState.ts` | Creates a goalStateByWeek entry |
| `deduplicateByRootGoalId` | `services/backend/src/usecase/goal/filter/deduplicateByRootGoalId.ts` | Deduplicates goals by rootGoalId chain |

**Impact:**

* ❌ Regression risk - bugs could be introduced without detection
* ❌ Edge cases not validated
* ❌ Hard to verify correctness of deduplication logic
* ❌ No confidence in refactoring these functions

**Recommendation:** Add unit tests for each function:

```typescript
// Example test structure for deduplicateByRootGoalId
describe('deduplicateByRootGoalId', () => {
  it('should keep first occurrence of each root goal', () => {
    const goals = [
      createMockGoal('g1', undefined), // root: g1
      createMockGoal('g2', 'g1'),      // root: g1 (duplicate)
      createMockGoal('g3', undefined), // root: g3
    ];
    const result = deduplicateByRootGoalId(goals);
    expect(result).toHaveLength(2);
    expect(result[0]._id).toBe('g1');
    expect(result[1]._id).toBe('g3');
  });

  it('should handle goals without carryOver metadata', () => {
    // Goals without carryOver should use their own _id as root
  });
});
```

***

## 🟠 High Priority

### 4. Race Condition in Daily Goal Creation

**Location:** `services/backend/convex/goal.ts:1488-1489`

**Issue:**

```typescript
const newWeeklyGoalId = weeklyGoalIdMap.get(dailyGoal.parentId!);
if (!newWeeklyGoalId) return;  // ❌ Silent failure
```

**Problem:** If `dailyGoal.parentId` is somehow not in `weeklyGoalIdMap`, the daily goal creation silently fails. This could lead to:

* Missing daily goals without any indication to the user
* Inconsistent state (weekly goal created but no daily children)
* Silent data loss that may not be noticed until later

**Current Behavior:** The function continues execution without the daily goal.

**Recommendation:** Add logging or throw an error:

```typescript
const newWeeklyGoalId = weeklyGoalIdMap.get(dailyGoal.parentId!);
if (!newWeeklyGoalId) {
  console.error(`[moveQuarterlyGoal] Missing weekly goal mapping for daily goal ${dailyGoal._id}. Parent: ${dailyGoal.parentId}`);
  throw new ConvexError({
    code: 'INTERNAL_ERROR',
    message: 'Failed to find parent weekly goal when migrating daily goals',
  });
}
```

***

### 5. Inefficient Daily Goal State Query

**Location:** `services/backend/convex/goal.ts:1453-1466`

**Issue:**

```typescript
const dailyGoalIds = dailyGoalsForOurWeeklyGoals.map((g) => g._id);
const dailyGoalStatesInMaxWeek =
  dailyGoalIds.length > 0
    ? await ctx.db
        .query('goalStateByWeek')
        .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
          q.eq('userId', userId).eq('year', from.year).eq('quarter', from.quarter).eq('weekNumber', lastNonEmptyWeek)
        )
        .filter((q) => q.or(...dailyGoalIds.map((id) => q.eq(q.field('goalId'), id))))  // ❌ Multiple OR conditions
        .collect()
    : [];
```

**Problem:** Using `.or()` with many goal IDs is:

1. **Inefficient** - Convex may not optimize this pattern well
2. **May hit query limits** - The number of `.or()` conditions could exceed Convex's internal limits
3. **Not leveraging indexing** - The filter applies after fetching all states for the week

**Performance Concern:** If a quarterly goal has 50 weekly goals with 10 daily goals each (500 daily goals), this creates 500 `.or()` conditions.

**Recommendation:** Use in-memory filtering instead:

```typescript
// Fetch all states for the week (indexed query)
const allStatesInWeek = await ctx.db
  .query('goalStateByWeek')
  .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
    q.eq('userId', userId)
     .eq('year', from.year)
     .eq('quarter', from.quarter)
     .eq('weekNumber', lastNonEmptyWeek)
  )
  .collect();

// Filter in-memory to only include our daily goals
const dailyGoalIdsSet = new Set(dailyGoalIds);
const dailyGoalStatesInMaxWeek = allStatesInWeek.filter(
  (state) => dailyGoalIdsSet.has(state.goalId)
);
```

This is more predictable and avoids the `.or()` chain issue.

***

### 6. Missing isComplete Filter in Preview

**Location:** `services/backend/convex/dashboard.ts:1271-1284`

**Issue:**

```typescript
// Get children (weekly goals for quarterly, or adhoc children)
let children: Doc<'goals'>[] = [];
let lastNonEmptyWeek: number | undefined = undefined;

if (goal.depth === 0) {
  // ... filtering logic ...
  children = allWeeklyGoals.filter((g) => maxWeekResult.weeklyGoalIdsInMaxWeek.has(g._id));
  // ❌ Missing: !g.isComplete filter
}
```

**Problem:** The query filters children but doesn't check `isComplete`. A completed weekly goal could show up in the preview, even though the move logic filters `!goal.isComplete`.

**Impact:**

* Preview shows completed goals that won't actually be migrated
* User confusion about what will be moved
* Expectation mismatch

**Recommendation:** Add `isComplete` filter:

```typescript
children = allWeeklyGoals.filter(
  (g) => maxWeekResult.weeklyGoalIdsInMaxWeek.has(g._id) && !g.isComplete
);
```

***

### 7. Type Cast Without Validation

**Location:** `apps/webapp/src/app/app/quarterly-pull-preview/goals/[goalId]/page.tsx:38`

**Issue:**

```typescript
const quarter = Number.parseInt(quarterParam) as 1 | 2 | 3 | 4;

if (isNaN(year) || isNaN(quarter) || quarter < 1 || quarter > 4) {
  throw new Error('Invalid year or quarter parameter');
}
```

**Problem:** The `as 1 | 2 | 3 | 4` cast happens BEFORE validation. The subsequent check validates the value, but TypeScript believes `quarter` is already `1 | 2 | 3 | 4` regardless of the actual runtime value.

**Impact:**

* TypeScript's type narrowing doesn't work correctly
* The cast could mislead developers
* If the check is removed, the cast remains unsafe

**Recommendation:**

```typescript
const year = Number.parseInt(yearParam);
const quarterNum = Number.parseInt(quarterParam);

if (isNaN(year) || isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
  throw new Error('Invalid year or quarter parameter');
}

// Safe to cast after validation
const quarter = quarterNum as 1 | 2 | 3 | 4;
```

***

## 🟡 Medium Priority

### 8. Redundant Queries in getGoalPullPreviewDetails

**Location:** `services/backend/convex/dashboard.ts:1273-1283`

**Issue:** The function queries for the goal twice:

1. First via `ctx.db.get('goals', goalId)` at line 1225
2. Then via `findMaxWeekForQuarterlyGoal` which re-queries the same weekly goals

```typescript
// Query 1: Get the goal
const goal = await ctx.db.get('goals', goalId);

// ... later ...

// Query 2: Get weekly goals (includes filtering by parentId = goalId)
const allWeeklyGoals = await ctx.db
  .query('goals')
  .withIndex('by_user_and_year_and_quarter_and_parent', (q) =>
    q.eq('userId', userId).eq('year', year).eq('quarter', quarter).eq('parentId', goalId)
  )
  .collect();
```

**Impact:** Minor inefficiency in a read-only query. The duplicate query is for different purposes (goal vs children), but there may be optimization opportunities.

**Recommendation:** This is low priority for a read-only query, but could be optimized if performance becomes an issue:

```typescript
// If we already have the goal, use its children directly if loaded
// Or batch the queries using Promise.all
const [goal, allWeeklyGoals] = await Promise.all([
  ctx.db.get('goals', goalId),
  ctx.db
    .query('goals')
    .withIndex('by_user_and_year_and_quarter_and_parent', ...)
    .collect(),
]);
```

***

### 9. Missing Error Boundaries in Frontend

**Location:** `apps/webapp/src/components/molecules/goal-details-popover/variants/QuarterlyGoalPullPreviewContent.tsx:113-122`

**Issue:** The component has loading and error states, but if the API throws an exception (not just returns null), it could crash the page.

**Current Implementation:**

```typescript
// Loading State
{goalDetails === undefined && (/* loading spinner */)}

// Not Found State
{goalDetails === null && (/* not found message */)}

// Goal Content
{goalDetails && (/* render goal */)}
```

**Problem:** If the `useSessionQuery` throws due to network error or API exception, `goalDetails` won't be `undefined`, `null`, or a valid object - it could be in an error state or throw an exception.

**Recommendation:** Wrap with an error boundary or add try/catch:

```typescript
import { ErrorBoundary } from '@/components/ui/error-boundary';

// Then wrap the content
<ErrorBoundary fallback={(error) => (
  <div className="p-4 text-red-500">
    Error loading goal: {error.message}
  </div>
)}>
  {goalDetails && <QuarterlyGoalPopoverContent />}
</ErrorBoundary>
```

***

### 10. Hardcoded Default DayOfWeek

**Location:** `services/backend/convex/goal.ts:1514`

**Issue:**

```typescript
daily: dailyState?.daily || { dayOfWeek: 1 }, // Default to Monday if not specified
```

**Problem:** Defaulting to Monday (day 1) is arbitrary. When a daily goal has no state, it gets assigned to Monday, which may not be the correct day.

**Impact:**

* Goals could appear on the wrong day of the week
* User confusion about goal placement
* Loss of original day assignment if it existed

**Recommendation:** Consider these options:

1. **Preserve original day assignment** if it exists:
   ```typescript
   // The daily goal might have its own dayOfWeek stored elsewhere
   const originalDay = dailyGoal.dayOfWeek;
   daily: dailyState?.daily || (originalDay ? { dayOfWeek: originalDay } : undefined)
   ```

2. **Require day assignment** - don't create daily goals without proper day info:
   ```typescript
   if (!dailyState?.daily?.dayOfWeek) {
     throw new ConvexError({
       code: 'INVALID_ARGUMENT',
       message: 'Daily goal must have a dayOfWeek assignment',
     });
   }
   ```

3. **Document the behavior** - if Monday default is intentional, document why:
   ```typescript
   // Default to Monday since:
   // 1. Most users start their week on Monday
   // 2. User can reassign day after migration
   // 3. Having some day is better than no day for visibility
   ```

***

### 11. Unused Return Property

**Location:** `services/backend/src/usecase/moveGoalsFromQuarter/findMaxWeekForQuarterlyGoal.ts:92-95`

**Issue:**

```typescript
return {
  maxWeek,
  weeklyGoalIdsInMaxWeek,
  weeklyGoalStatesInMaxWeek: statesInMaxWeek.map((s) => ({
    goalId: s.goalId,
    weekNumber: s.weekNumber,
  })),  // ❌ This is returned but not used by callers
};
```

**Problem:** The `weeklyGoalStatesInMaxWeek` property is populated but never used by any caller. Either:

* This is dead code that should be removed
* The function interface is overly broad for its current use case

**Recommendation:** Remove the unused property to simplify the interface:

```typescript
return {
  maxWeek,
  weeklyGoalIdsInMaxWeek,
};
```

Or if you anticipate using it later, add a comment:

```typescript
return {
  maxWeek,
  weeklyGoalIdsInMaxWeek,
  // Note: weeklyGoalStatesInMaxWeek is populated but not currently used.
  // This could be used for getting additional state info if needed.
  weeklyGoalStatesInMaxWeek: statesInMaxWeek.map((s) => ({
    goalId: s.goalId,
    weekNumber: s.weekNumber,
  })),
};
```

***

## 🟢 Low Priority / Improvements

### 12. Missing TypeScript Export Documentation

The new helper functions have JSDoc comments, but some could be enhanced for better IDE autocompletion:

````typescript
/**
 * Creates a new goal with proper carry-over metadata.
 * Preserves the rootGoalId chain for tracking goal lineage.
 *
 * The carry-over chain allows tracking the history of a goal:
 * - `previousGoalId`: The immediate source goal this was copied from
 * - `rootGoalId`: The original goal at the start of the carry-over chain
 * - `numWeeks`: How many times this goal has been carried over
 *
 * @param params - The parameters for creating the goal
 * @returns The ID of the newly created goal
 *
 * @example
 * ```typescript
 * const newGoalId = await createGoalWithCarryOver({
 *   ctx,
 *   userId,
 *   sourceGoal: existingGoal,
 *   target: { year: 2025, quarter: 1 },
 *   parentId: quarterlyGoalId,
 *   depth: GoalDepth.WEEKLY,
 *   inPath: '/quarterlyGoalId',
 * });
 * ```
 */
export async function createGoalWithCarryOver(
  params: CreateGoalWithCarryOverParams
): Promise<Id<'goals'>> { ... }
````

***

### 13. Large Mutation Function

The `moveQuarterlyGoal` function is now ~250 lines. This makes it:

* Harder to test
* Harder to maintain
* More prone to bugs

**Recommendation:** Consider breaking into smaller, testable units:

```typescript
// services/backend/src/usecase/moveGoalsFromQuarter/index.ts

/**
 * Orchestrates the complete quarterly goal migration process.
 */
export async function moveQuarterlyGoal(ctx, args) {
  const { source, target, ... } = args;

  // 1. Validate and prepare
  const quarterlyGoal = await validateSourceGoal(...);
  const maxWeekResult = await findMaxWeekForQuarterlyGoal(...);

  // 2. Create quarterly goal in new quarter
  const newQuarterlyGoalId = await createQuarterlyGoalInNewQuarter(...);

  // 3. Migrate weekly goals
  const weeklyGoalIdMap = await migrateWeeklyGoals({
    ctx,
    weeklyGoals,
    target,
    newQuarterlyGoalId,
  });

  // 4. Migrate daily goals
  await migrateDailyGoals({
    ctx,
    dailyGoals,
    target,
    weeklyGoalIdMap,
  });

  return { newGoalId: newQuarterlyGoalId };
}
```

***

### 14. No Rollback on Partial Failure

If the `moveQuarterlyGoal` mutation fails partway through (e.g., after creating weekly goals but before daily goals), there's no cleanup mechanism. The database could be left in an inconsistent state.

**Current Behavior:** If mutation fails, Convex's transactional model should prevent partial writes. However, if there's a logic bug that doesn't throw, or if some writes succeed and others don't, you could have orphaned goals.

**Recommendation:**

1. **Document current behavior** - Confirm Convex handles transactions correctly
2. **Add validation before writes** - Validate all inputs before any database mutations
3. **Consider soft deletes** - If cleanup is needed, use a cleanup function

```typescript
// Example cleanup pattern
const createdGoalIds: Id<'goals'>[] = [];

try {
  const newQuarterlyGoalId = await createGoal(...);
  createdGoalIds.push(newQuarterlyGoalId);

  const weeklyGoalIds = await migrateWeeklyGoals(...);
  createdGoalIds.push(...weeklyGoalIds);

  // ... more operations

} catch (error) {
  // Rollback: delete all created goals
  await Promise.all(createdGoalIds.map(id => ctx.db.delete('goals', id)));
  throw error;
}
```

***

### 15. Inconsistent Property Naming

**Location:** Various files

**Observation:** The codebase uses different naming conventions for similar concepts:

| Pattern | Example |
|---------|---------|
| `camelCase` | `isStarred`, `isPinned`, `lastNonEmptyWeek` |
| `PascalCase` types | `GoalDepth`, `CreateGoalWithCarryOverParams` |
| Abbreviated names | `adhoc`, `ctx`, `args` |

**Recommendation:** This is generally fine, but ensure consistency within similar contexts. Consider adding a project style guide if one doesn't exist.

***

## ✅ Positive Findings

### What's Working Well:

1. **Excellent extraction of shared logic**
   * `createGoalWithCarryOver` is well-designed and properly typed
   * `createGoalState` provides consistent defaults
   * `deduplicateByRootGoalId` handles the use case cleanly

2. **Good separation of concerns**
   * `findMaxWeekForQuarterlyGoal` is focused and reusable
   * Each function has a single responsibility
   * Clear boundaries between query and mutation logic

3. **Proper type exports**
   * Index files properly export new helpers
   * Types are well-defined with interfaces
   * Good use of TypeScript generics where needed

4. **Clear documentation**
   * Functions have good JSDoc comments explaining their purpose
   * Comments explain the "why" behind complex logic
   * Public API functions have `@public` tags

5. **Consistent carry-over chain preservation**
   * The logic correctly tracks `rootGoalId` through migrations
   * `numWeeks` counter is incremented correctly
   * Previous goal references are preserved

6. **Frontend loading states**
   * Proper handling of undefined, null, and data states
   * Loading spinner for async operations
   * Error/not-found states are considered

7. **Deduplication logic**
   * `deduplicateByRootGoalId` correctly handles the use case
   * Properly handles goals without carryOver metadata
   * Uses Set for O(1) lookup

***

## 📊 Summary Metrics

| Category | Count | Severity |
|----------|-------|----------|
| Critical Issues | 3 | 🔴 High |
| High Priority | 4 | 🟠 Medium |
| Medium Priority | 3 | 🟡 Low |
| Low Priority / Improvements | 4 | 🟢 Very Low |
| Positive Findings | 7 | ✅ |

**Total Issues:** 14

***

## 🎯 Recommended Next Steps

### Immediate (Before Merge)

1. **Fix Critical Issue #1** - The duplicate migration bug could cause data integrity issues
2. **Fix Critical Issue #2** - The missing index could cause performance problems at scale
3. **Fix Critical Issue #3** - Add tests for all new helper functions

### High Priority (Follow-up PR)

4. **Fix High Issue #4** - Silent failures are dangerous
5. **Fix High Issue #5** - Inefficient query could cause performance issues
6. **Fix High Issue #6** - Preview/actual behavior mismatch
7. **Fix High Issue #7** - Type safety issue

### Medium Priority (Backlog)

8-11. Address medium priority issues when time permits

### Low Priority (When Time Allows)

12-15. Improvements for maintainability and robustness

***

## Files Changed Summary

| File | Changes | Purpose |
|------|---------|---------|
| `services/backend/convex/dashboard.ts` | +132 lines | New `getGoalPullPreviewDetails` query |
| `services/backend/convex/goal.ts` | +355/-188 lines | Refactor to use new helpers |
| `services/backend/src/usecase/moveGoalsFromQuarter/findMaxWeekForQuarterlyGoal.ts` | +97 lines | New helper for finding max week |
| `services/backend/src/usecase/goal/create-goal/createGoalWithCarryOver.ts` | +98 lines | New helper for goal creation |
| `services/backend/src/usecase/goal/create-goal/createGoalState.ts` | +69 lines | New helper for state creation |
| `services/backend/src/usecase/goal/filter/deduplicateByRootGoalId.ts` | +28 lines | New helper for deduplication |
| `apps/webapp/src/app/app/quarterly-pull-preview/goals/[goalId]/page.tsx` | +58 lines | New preview page |
| `apps/webapp/src/components/molecules/goal-details-popover/variants/QuarterlyGoalPullPreviewContent.tsx` | +235 lines | New preview component |
| `docs/plans/reduce-duplication.md` | +280 lines | Planning documentation |

***

## Testing Checklist

Before merging, ensure:

* \[ ] Unit tests for `findMaxWeekForQuarterlyGoal`
* \[ ] Unit tests for `createGoalWithCarryOver`
* \[ ] Unit tests for `createGoalState`
* \[ ] Unit tests for `deduplicateByRootGoalId`
* \[ ] Integration test for `moveQuarterlyGoal` with deduplication
* \[ ] Integration test for `getGoalPullPreviewDetails` query
* \[ ] Manual testing of quarterly goal migration flow
* \[ ] Manual testing of preview page with various goal states

***

*Review completed on December 30, 2025*
