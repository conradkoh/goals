# Convex Optimistic Updates Implementation Plan

## Status

**In Progress** - Cleanup completed, starting implementation

## Goal

Migrate from custom optimistic updates to Convex's built-in optimistic updates (v1.31+) for better performance and less code complexity.

## Completed

- [x] Reverted incomplete optimistic update attempt
- [x] Fixed linting issues
- [x] Removed temporary documentation files

## Current Challenge

Convex's `withOptimisticUpdate()` callback receives `(localStore, args)` where:
- `localStore`: Interface to read/write cached query results
- `args`: The mutation arguments

To update a query optimistically, we need to call:
```typescript
localStore.setQuery(api.dashboard.getWeek, { sessionId, year, quarter, weekNumber }, updatedData)
```

**Problem**: The `toggleGoalCompletion` mutation doesn't include `year` and `quarter` in its args - it looks them up from the goal in the database. But in the optimistic update callback, we can't query the database, only the local cache.

## Solution Options

### Option A: Add year/quarter to Mutation Args (Recommended)

**Pros:**
- Clean, explicit interface
- Easy to implement optimistic updates
- Follows Convex best practices

**Cons:**
- Requires updating all call sites
- Adds redundant data (year/quarter already in goal record)

**Implementation:**
1. Update `toggleGoalCompletion` mutation signature to include optional `year` and `quarter`
2. Implement `.withOptimisticUpdate()` that uses these parameters
3. Update `useWeek` to pass year/quarter from context
4. Update all components calling `toggleGoalCompletion`

### Option B: Iterate Through Local Store Queries

**Pros:**
- No API changes needed
- Works with existing call sites

**Cons:**
- Convex's `localStore` API doesn't provide easy iteration
- Performance implications of searching through queries
- More complex code

### Option C: Keep Custom Optimistic Updates

**Pros:**
- No migration needed
- Already working (mostly)

**Cons:**
- More code to maintain
- Duplicates Convex's functionality
- Has existing bugs (goals disappearing, fire goals, etc.)

## Recommended Approach: Option A

### Step 1: Update Backend Mutation

```typescript
// services/backend/convex/dashboard.ts
export const toggleGoalCompletion = mutation({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    weekNumber: v.number(),
    isComplete: v.boolean(),
    updateChildren: v.optional(v.boolean()),
    // Add these for optimistic updates
    year: v.optional(v.number()),
    quarter: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Existing logic remains the same
    // year/quarter are optional and only used client-side
  }
})
```

### Step 2: Implement Optimistic Update

```typescript
// apps/webapp/src/hooks/useGoalActions.tsx
const toggleGoalCompletionMutation = useMutation(
  api.dashboard.toggleGoalCompletion
).withOptimisticUpdate((localStore, args) => {
  const { goalId, isComplete, updateChildren, weekNumber, year, quarter, sessionId } = args;
  
  if (!year || !quarter) {
    // Skip optimistic update if context not provided
    return;
  }

  const weekQuery = localStore.getQuery(api.dashboard.getWeek, {
    sessionId,
    year,
    quarter,
    weekNumber,
  });

  if (!weekQuery) return;

  // Update goals in tree...
  const updatedAllGoals = weekQuery.tree.allGoals.map((g) => {
    if (g._id === goalId || (updateChildren && g.parentId === goalId)) {
      return {
        ...g,
        isComplete,
        completedAt: isComplete ? Date.now() : undefined,
      };
    }
    return g;
  });

  // Recursively update hierarchical tree...
  const updatedQuarterlyGoals = updateHierarchy(weekQuery.tree.quarterlyGoals, goalId, isComplete, updateChildren);

  localStore.setQuery(
    api.dashboard.getWeek,
    { sessionId, year, quarter, weekNumber },
    {
      ...weekQuery,
      tree: {
        ...weekQuery.tree,
        allGoals: updatedAllGoals,
        quarterlyGoals: updatedQuarterlyGoals,
      },
    }
  );
});
```

### Step 3: Update useWeek Hook

```typescript
// apps/webapp/src/hooks/useWeek.tsx
export const useWeek = () => {
  const context = useContext(WeekContext);
  const goalActions = useGoalActions();
  
  return useMemo(
    () => ({
      ...context,
      ...goalActions,
      // Override toggleGoalCompletion to inject year/quarter
      toggleGoalCompletion: async (args) => {
        return goalActions.toggleGoalCompletion({
          ...args,
          year: context.year,
          quarter: context.quarter,
        });
      },
    }),
    [context, goalActions]
  );
};
```

### Step 4: Test

1. Toggle goal completion - should update immediately
2. Verify child goals update when `updateChildren: true`
3. Test with slow network (throttle in DevTools)
4. Verify rollback on error

### Step 5: Repeat for Other Mutations

Apply the same pattern to:
- `createQuarterlyGoal`
- `createWeeklyGoal`
- `createDailyGoal`
- `deleteGoal`
- `updateQuarterlyGoalTitle`
- `updateDailyGoalDay`

### Step 6: Remove Custom Optimistic Code

Once all mutations use Convex optimistic updates:
- Remove `useOptimisticArray` hook
- Remove optimistic state from `useWeek`
- Remove optimistic state from `useAdhocGoals`
- Clean up related code

## Next Actions

1. Implement Step 1 (update backend mutation)
2. Implement Step 2 (add optimistic update)
3. Implement Step 3 (update useWeek)
4. Test thoroughly
5. Proceed with other mutations

## Notes

- Convex automatically handles rollback on mutation failure
- Optimistic updates are applied immediately, then reconciled when mutation completes
- No need for manual cleanup or error handling
