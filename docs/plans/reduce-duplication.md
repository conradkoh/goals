# Plan: Reduce Code Duplication in Goal Management

## Overview

This document outlines the plan to reduce code duplication in the goal management backend, specifically in `services/backend/convex/goal.ts` and `services/backend/convex/dashboard.ts`.

## Current State

The codebase has several pieces of duplicated logic that have evolved organically as features were added:

1. **"Find Max Week for Quarterly Goal" logic** - duplicated between `moveQuarterlyGoal` and `getGoalPullPreviewDetails`
2. **Goal creation with carry-over metadata** - repeated for quarterly, weekly, and daily goals
3. **Deduplication by rootGoalId** - repeated for weekly and daily goals
4. **Goal state creation** - similar patterns throughout

## Proposed Changes

### Phase 1: Create Shared Helpers (Co-located with existing usecase folder)

Create a new folder: `services/backend/src/usecase/goal/`

#### 1.1 `findMaxWeekForQuarterlyGoal.ts`

**Purpose:** Find the maximum week number where a quarterly goal's children have states.

**Current locations:**
- `dashboard.ts` lines 1272-1298 (`getGoalPullPreviewDetails`)
- `goal.ts` lines 1277-1300 (`moveQuarterlyGoal`)

**Proposed interface:**
```typescript
import type { QueryCtx } from '../../convex/_generated/server';
import type { Id } from '../../convex/_generated/dataModel';

/**
 * Finds the maximum week number where a quarterly goal's weekly children have states.
 * This represents the "last non-empty week" for a specific quarterly goal.
 * 
 * @param ctx - Query context for database access
 * @param userId - The user ID
 * @param quarterlyGoalId - The quarterly goal to find max week for
 * @param year - The year of the quarter
 * @param quarter - The quarter number (1-4)
 * @returns The max week number, or null if no states found
 */
export async function findMaxWeekForQuarterlyGoal(
  ctx: QueryCtx,
  userId: Id<'users'>,
  quarterlyGoalId: Id<'goals'>,
  year: number,
  quarter: number
): Promise<number | null>
```

**Note:** This is distinct from `findLastNonEmptyWeek` in `moveGoalsFromWeek/` which:
- Searches backwards from a given week
- Checks ALL goals, not specific to one quarterly goal
- Crosses quarter boundaries

#### 1.2 `createGoalWithCarryOver.ts`

**Purpose:** Create a goal with proper carry-over metadata, preserving the root goal chain.

**Current locations:**
- `goal.ts` lines 1339-1357 (quarterly goal creation)
- `goal.ts` lines 1418-1437 (weekly goal creation)
- `goal.ts` lines 1535-1554 (daily goal creation)

**Proposed interface:**
```typescript
import type { MutationCtx } from '../../convex/_generated/server';
import type { Doc, Id } from '../../convex/_generated/dataModel';

interface CreateGoalWithCarryOverParams {
  ctx: MutationCtx;
  userId: Id<'users'>;
  sourceGoal: Doc<'goals'>;
  target: {
    year: number;
    quarter: number;
  };
  parentId?: Id<'goals'>;
  depth: 0 | 1 | 2; // quarterly, weekly, daily
  inPath: string;
}

/**
 * Creates a new goal with proper carry-over metadata.
 * Preserves the rootGoalId chain for tracking goal lineage.
 * 
 * @returns The ID of the newly created goal
 */
export async function createGoalWithCarryOver(
  params: CreateGoalWithCarryOverParams
): Promise<Id<'goals'>>
```

#### 1.3 `deduplicateByRootGoalId.ts`

**Purpose:** Filter a list of goals to remove duplicates based on their root goal ID.

**Current locations:**
- `goal.ts` lines 1392-1401 (weekly goals)
- `goal.ts` lines 1511-1520 (daily goals)

**Proposed interface:**
```typescript
import type { Doc, Id } from '../../convex/_generated/dataModel';

/**
 * Deduplicates goals by their rootGoalId.
 * When a goal has been carried over multiple times, only keep one instance.
 * 
 * @param goals - Array of goals to deduplicate
 * @returns Deduplicated array, keeping the first occurrence of each root goal
 */
export function deduplicateByRootGoalId<T extends Doc<'goals'>>(
  goals: T[]
): T[]
```

#### 1.4 `createGoalState.ts`

**Purpose:** Create a goalStateByWeek entry with consistent defaults.

**Proposed interface:**
```typescript
import type { MutationCtx } from '../../convex/_generated/server';
import type { Id } from '../../convex/_generated/dataModel';

interface CreateGoalStateParams {
  ctx: MutationCtx;
  userId: Id<'users'>;
  goalId: Id<'goals'>;
  year: number;
  quarter: number;
  weekNumber: number;
  isStarred?: boolean;
  isPinned?: boolean;
  daily?: { dayOfWeek: number };
}

/**
 * Creates a goalStateByWeek entry with consistent defaults.
 */
export async function createGoalState(
  params: CreateGoalStateParams
): Promise<Id<'goalStateByWeek'>>
```

### Phase 2: Update Consumers

After creating the helpers, update the following files to use them:

1. **`services/backend/convex/goal.ts`**
   - `moveQuarterlyGoal` mutation

2. **`services/backend/convex/dashboard.ts`**
   - `getGoalPullPreviewDetails` query

### Phase 3: Add Tests

Create unit tests for the new helpers:

```
services/backend/src/usecase/goal/
├── findMaxWeekForQuarterlyGoal.spec.ts
├── createGoalWithCarryOver.spec.ts
├── deduplicateByRootGoalId.spec.ts
└── createGoalState.spec.ts
```

## File Structure After Refactoring

```
services/backend/src/usecase/
├── goal/                                    # NEW
│   ├── index.ts                             # Re-exports all helpers
│   ├── findMaxWeekForQuarterlyGoal.ts
│   ├── findMaxWeekForQuarterlyGoal.spec.ts
│   ├── createGoalWithCarryOver.ts
│   ├── createGoalWithCarryOver.spec.ts
│   ├── deduplicateByRootGoalId.ts
│   ├── deduplicateByRootGoalId.spec.ts
│   ├── createGoalState.ts
│   ├── createGoalState.spec.ts
│   └── types.ts                             # Shared types
├── moveGoalsFromWeek/                       # Existing
│   ├── findLastNonEmptyWeek.ts              # Keep separate - different use case
│   └── ...
└── quarter/                                 # Existing
    └── ...
```

## Benefits

1. **DRY (Don't Repeat Yourself):** Single source of truth for each piece of logic
2. **Testability:** Helpers can be unit tested independently
3. **Maintainability:** Bug fixes and improvements only need to be made once
4. **Discoverability:** Co-located helpers are easy to find
5. **Type Safety:** Shared types ensure consistency

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Regression in existing behavior | Comprehensive test coverage before refactoring |
| Over-abstraction | Keep helpers focused and single-purpose |
| Breaking changes to API | Internal refactoring only, no public API changes |

## Implementation Order

1. [ ] Create `services/backend/src/usecase/goal/` folder structure
2. [ ] Implement `deduplicateByRootGoalId.ts` (simplest, pure function)
3. [ ] Implement `findMaxWeekForQuarterlyGoal.ts`
4. [ ] Implement `createGoalState.ts`
5. [ ] Implement `createGoalWithCarryOver.ts`
6. [ ] Update `dashboard.ts` to use new helpers
7. [ ] Update `goal.ts` to use new helpers
8. [ ] Add comprehensive tests
9. [ ] Clean up any remaining duplication

## Notes

- The existing `findLastNonEmptyWeek` in `moveGoalsFromWeek/` serves a different purpose (searching backwards from a given week across all goals) and should remain separate.
- All helpers should use `QueryCtx` where possible (since `MutationCtx` extends `QueryCtx`) to maximize reusability.

