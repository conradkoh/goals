# Refactoring Guide: Shared Goal Handler Types (Phase 1)

**Estimated Time**: 1-2 hours  
**Risk Level**: Low  
**Impact**: High (prevents future bugs like the due date issue)

---

## Step 1: Create Shared Types File

Create `apps/webapp/src/models/goal-handlers.ts`:

```typescript
import type { Id } from "@services/backend/convex/_generated/dataModel";

/**
 * Handler for updating a goal's title, details, and due date.
 * This is the primary update handler used across all goal components.
 *
 * @param goalId - The ID of the goal to update
 * @param title - The new title for the goal
 * @param details - Optional rich text details/description
 * @param dueDate - Optional due date as Unix timestamp (milliseconds)
 *
 * @example
 * const handleUpdate: GoalUpdateHandler = async (goalId, title, details, dueDate) => {
 *   await updateQuarterlyGoalTitle({ goalId, title, details, dueDate });
 * };
 */
export type GoalUpdateHandler = (
  goalId: Id<"goals">,
  title: string,
  details?: string,
  dueDate?: number
) => Promise<void>;

/**
 * Simplified update handler that doesn't require a goal ID.
 * Used in contexts where the goal is already known (e.g., modal editing).
 *
 * @param title - The new title for the goal
 * @param details - Optional rich text details/description
 * @param dueDate - Optional due date as Unix timestamp (milliseconds)
 */
export type GoalSaveHandler = (
  title: string,
  details?: string,
  dueDate?: number
) => Promise<void>;

/**
 * Handler for toggling goal completion status.
 *
 * @param isComplete - Whether the goal should be marked as complete
 */
export type GoalCompletionHandler = (isComplete: boolean) => Promise<void>;

/**
 * Handler for deleting a goal.
 *
 * @param goalId - The ID of the goal to delete
 */
export type GoalDeleteHandler = (goalId: Id<"goals">) => Promise<void>;

/**
 * Standard props for components that display and allow editing of goal details.
 * Use this interface for modals, popovers, and inline editors.
 */
export interface GoalDetailsHandlers {
  /** Handler called when the user saves changes to the goal */
  onSave: GoalSaveHandler;

  /** Optional handler for toggling goal completion */
  onToggleComplete?: GoalCompletionHandler;
}

/**
 * Standard props for components in a list view that need CRUD operations.
 * Use this interface for list items, cards, and similar components.
 */
export interface GoalListItemHandlers {
  /** Handler for updating goal properties */
  onUpdateGoal: GoalUpdateHandler;

  /** Handler for deleting the goal */
  onDeleteGoal: GoalDeleteHandler;

  /** Optional handler for toggling completion */
  onToggleComplete?: GoalCompletionHandler;
}
```

---

## Step 2: Update High-Traffic Components (Incremental Migration)

### Priority 1: Goal Details Components

**File**: `apps/webapp/src/components/molecules/goal-details/GoalDetailsPopover.tsx`

```typescript
// BEFORE
interface GoalDetailsPopoverProps {
  goal: GoalWithDetailsAndChildren;
  onSave: (title: string, details?: string, dueDate?: number) => Promise<void>;
  // ... other props
}

// AFTER
import type { GoalSaveHandler } from "@/models/goal-handlers";

interface GoalDetailsPopoverProps {
  goal: GoalWithDetailsAndChildren;
  onSave: GoalSaveHandler; // ✅ Use shared type
  // ... other props
}
```

**File**: `apps/webapp/src/components/molecules/goal-details/GoalDetailsFullScreenModal.tsx`

```typescript
// Same change as above
import type {
  GoalSaveHandler,
  GoalCompletionHandler,
} from "@/models/goal-handlers";

interface GoalDetailsFullScreenModalProps {
  goal: GoalWithDetailsAndChildren;
  onSave: GoalSaveHandler;
  onToggleComplete?: GoalCompletionHandler;
  isOpen: boolean;
  onClose: () => void;
}
```

### Priority 2: List Item Components

**File**: `apps/webapp/src/components/organisms/QuarterlyGoal.tsx`

```typescript
// BEFORE
interface QuarterlyGoalProps {
  goal: GoalWithDetailsAndChildren;
  onToggleStatus: (
    goalId: Id<"goals">,
    isStarred: boolean,
    isPinned: boolean
  ) => Promise<void>;
  onUpdateTitle: (
    goalId: Id<"goals">,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
}

// AFTER
import type { GoalUpdateHandler } from "@/models/goal-handlers";

interface QuarterlyGoalProps {
  goal: GoalWithDetailsAndChildren;
  onToggleStatus: (
    goalId: Id<"goals">,
    isStarred: boolean,
    isPinned: boolean
  ) => Promise<void>;
  onUpdateGoal: GoalUpdateHandler; // ✅ Renamed for consistency + shared type
}

// Update usage inside component:
function QuarterlyGoal({
  goal,
  onToggleStatus,
  onUpdateGoal,
}: QuarterlyGoalProps) {
  const handleSaveTitle = useCallback(
    async (title: string, details?: string, dueDate?: number) => {
      await onUpdateGoal(goal._id, title, details, dueDate);
    },
    [goal._id, onUpdateGoal] // ✅ Updated dependency
  );

  // ... rest of component
}
```

### Priority 3: Container Components

**File**: `apps/webapp/src/components/organisms/DailyGoalList.tsx`

```typescript
// BEFORE (4 duplicate interfaces!)
export interface DailyGoalListProps {
  goals: GoalWithDetailsAndChildren[];
  onUpdateGoalTitle: (
    goalId: Id<"goals">,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
  onDeleteGoal?: (goalId: Id<"goals">) => Promise<void>;
  className?: string;
}

export interface DailyGoalListContainerProps {
  goals: GoalWithDetailsAndChildren[];
  onUpdateGoalTitle: (
    goalId: Id<"goals">,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
  onDeleteGoal: (goalId: Id<"goals">) => Promise<void>;
  // ... more props
}

// AFTER (use shared types!)
import type {
  GoalUpdateHandler,
  GoalDeleteHandler,
} from "@/models/goal-handlers";

export interface DailyGoalListProps {
  goals: GoalWithDetailsAndChildren[];
  onUpdateGoal: GoalUpdateHandler; // ✅ Shared type
  onDeleteGoal?: GoalDeleteHandler; // ✅ Shared type
  className?: string;
}

export interface DailyGoalListContainerProps {
  goals: GoalWithDetailsAndChildren[];
  onUpdateGoal: GoalUpdateHandler; // ✅ Shared type
  onDeleteGoal: GoalDeleteHandler; // ✅ Shared type
  onCreateGoal: (title: string) => Promise<void>;
  className?: string;
  createInputPlaceholder?: string;
  isCreating?: boolean;
  children?: React.ReactNode;
}
```

---

## Step 3: Update Remaining Files (Batch Migration)

Use find-and-replace with caution:

### Search Pattern 1: Update handlers

```typescript
// Find:
onUpdateTitle: \(goalId: Id<'goals'>, title: string, details\?: string, dueDate\?: number\) => Promise<void>

// Replace with:
onUpdateGoal: GoalUpdateHandler
```

### Search Pattern 2: Save handlers

```typescript
// Find:
onSave: \(title: string, details\?: string, dueDate\?: number\) => Promise<void>

// Replace with:
onSave: GoalSaveHandler
```

**Files to update**:

1. ✅ `apps/webapp/src/components/organisms/QuarterlyGoal.tsx`
2. ✅ `apps/webapp/src/components/organisms/DailyGoalList.tsx`
3. ✅ `apps/webapp/src/components/organisms/DailyGoalGroup.tsx`
4. ✅ `apps/webapp/src/components/organisms/DailyGoalListContainer.tsx`
5. ✅ `apps/webapp/src/components/organisms/WeekCardQuarterlyGoals.tsx`
6. ✅ `apps/webapp/src/components/organisms/focus/OnFireGoalsSection.tsx`
7. ✅ `apps/webapp/src/components/organisms/focus/PendingGoalsSection.tsx`
8. ✅ `apps/webapp/src/components/molecules/day-of-week/components/QuarterlyGoalHeader.tsx`
9. ✅ `apps/webapp/src/components/molecules/day-of-week/components/WeeklyGoalTaskItem.tsx`
10. ✅ `apps/webapp/src/components/molecules/day-of-week/containers/DayContainer.tsx`
11. ✅ `apps/webapp/src/components/molecules/quarterly-summary/DailySummaryItem.tsx`
12. ✅ `apps/webapp/src/components/molecules/quarterly-summary/WeeklySummarySection.tsx`
13. ✅ `apps/webapp/src/components/molecules/quarterly-summary/WeeklyTaskItem.tsx`

---

## Step 4: Verify Changes

Run these commands to ensure everything still works:

```bash
# TypeScript checks
pnpm typecheck

# Linting
pnpm lint

# If you have tests
pnpm test
```

---

## Step 5: Update Hook Signatures (Optional but Recommended)

**File**: `apps/webapp/src/hooks/useSummaryGoalActions.tsx`

```typescript
// BEFORE
export interface SummaryGoalActions {
  handleToggleComplete: (
    goal: GoalWithDetailsAndChildren,
    weekNumber: number
  ) => Promise<void>;
  handleEditGoal: (
    goalId: Id<"goals">,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
  handleDeleteGoal: (goalId: Id<"goals">) => Promise<void>;
  isLoading: boolean;
}

// AFTER
import type {
  GoalUpdateHandler,
  GoalDeleteHandler,
} from "@/models/goal-handlers";

export interface SummaryGoalActions {
  handleToggleComplete: (
    goal: GoalWithDetailsAndChildren,
    weekNumber: number
  ) => Promise<void>;
  handleEditGoal: GoalUpdateHandler; // ✅ Simpler!
  handleDeleteGoal: GoalDeleteHandler; // ✅ Simpler!
  isLoading: boolean;
}
```

---

## Benefits After This Refactoring

### Before ❌

```typescript
// 14 different files with:
onUpdateTitle: (
  goalId: Id<"goals">,
  title: string,
  details?: string,
  dueDate?: number
) => Promise<void>;
```

When adding a new parameter:

- ❌ Must update 14+ type definitions
- ❌ Easy to miss one
- ❌ TypeScript can't help (optional params)
- ❌ No consistency checks

### After ✅

```typescript
// 1 shared type:
export type GoalUpdateHandler = (
  goalId: Id<"goals">,
  title: string,
  details?: string,
  dueDate?: number
) => Promise<void>;

// Used everywhere:
onUpdateGoal: GoalUpdateHandler;
```

When adding a new parameter:

- ✅ Update 1 type definition
- ✅ TypeScript errors everywhere it's used
- ✅ Impossible to miss
- ✅ Guaranteed consistency

---

## Naming Standardization (Bonus)

While refactoring, standardize names:

| Old Name (inconsistent) | New Name (standard) | Type                              |
| ----------------------- | ------------------- | --------------------------------- |
| `onUpdateTitle`         | `onUpdateGoal`      | `GoalUpdateHandler`               |
| `onUpdateGoalTitle`     | `onUpdateGoal`      | `GoalUpdateHandler`               |
| `handleSaveTitle`       | `handleSaveGoal`    | Internal handler                  |
| `handleEditGoal`        | `handleUpdateGoal`  | Internal handler                  |
| `onSave`                | `onSave`            | `GoalSaveHandler` (modal context) |

---

## Testing the Changes

### Manual Test Checklist

- [ ] Edit a quarterly goal's due date → saves correctly
- [ ] Edit a weekly goal's due date → saves correctly
- [ ] Edit a daily goal's due date → saves correctly
- [ ] Edit goal from quarterly summary view → works
- [ ] Edit goal from focus view → works
- [ ] TypeScript has no errors
- [ ] All lints pass

### If Something Breaks

1. Check that you updated both the interface AND the usage
2. Verify import statements include the new shared types
3. Make sure function names match (if you renamed from `onUpdateTitle` to `onUpdateGoal`)

---

## Next Steps (Phase 2)

After this is complete, consider:

1. **Introduce Context** to eliminate prop drilling entirely
2. **Consolidate similar hooks** (`useGoalActions` + `useSummaryGoalActions`)
3. **Extract business logic** from components into custom hooks

See `docs/technical-debt-analysis.md` for the full roadmap.

---

## Summary

This refactoring:

- ✅ Creates single source of truth for types
- ✅ Reduces 14+ duplicate definitions to 1
- ✅ Prevents future bugs like the due date issue
- ✅ Improves code maintainability
- ✅ Low risk, high reward
- ✅ Can be done incrementally

**Time investment**: 1-2 hours  
**Long-term savings**: Hours per feature, fewer bugs
