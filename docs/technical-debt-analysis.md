# Technical Debt Analysis: Due Date Bug & Code Quality Issues

**Date**: 2025-10-13  
**Issue**: Due date parameter was dropped in callback chain, requiring updates to 14+ files

## Root Cause Analysis

### Why We Missed This

The bug occurred because of **prop drilling** and **type fragmentation**. When adding the `dueDate` parameter:

1. ✅ Backend mutations were updated
2. ✅ Frontend hooks (`useGoalActions`) were updated
3. ❌ **14+ intermediate components** with callback props were missed

The type system didn't catch this because:

- Each component defined its own callback signature (no shared type)
- Parameters were optional, so TypeScript didn't error on missing params
- The `as any` workarounds on Convex mutations masked type mismatches

---

## Critical Code Smells & Tech Debt

### 1. 🔴 **Prop Drilling Anti-Pattern** (HIGH PRIORITY)

**Problem**: Goal update handlers are passed through 3-5 layers of components:

```
useGoalActions (hook)
  ↓
WeekCardQuarterlyGoals (container)
  ↓ onUpdateTitle prop
QuarterlyGoal (component)
  ↓ onSave prop
GoalDetailsPopover (modal)
  ↓ save handler
```

**Evidence**: 14 files needed updating for a single parameter change:

- `QuarterlyGoal.tsx`
- `WeekCardQuarterlyGoals.tsx`
- `DailyGoalList.tsx` (4 interfaces!)
- `DayContainer.tsx`
- `QuarterlyGoalHeader.tsx`
- `WeeklyGoalTaskItem.tsx`
- Plus 7 more...

**Impact**:

- High maintenance burden
- Easy to miss updates (as we saw)
- Poor developer experience
- Brittle code

---

### 2. 🔴 **Type Fragmentation** (HIGH PRIORITY)

**Problem**: Same callback signature duplicated across 14+ files with slight variations:

```typescript
// File 1: QuarterlyGoal.tsx
onUpdateTitle: (
  goalId: Id<"goals">,
  title: string,
  details?: string,
  dueDate?: number
) => Promise<void>;

// File 2: DailyGoalList.tsx (appears 4 times!)
onUpdateGoalTitle: (
  goalId: Id<"goals">,
  title: string,
  details?: string,
  dueDate?: number
) => Promise<void>;

// File 3: WeeklyGoalTaskItem.tsx
onUpdateTitle: (
  goalId: Id<"goals">,
  title: string,
  details?: string,
  dueDate?: number
) => Promise<void>;
```

**Problems**:

- ❌ No single source of truth
- ❌ Must manually update each file
- ❌ Easy to create inconsistencies
- ❌ Type system can't help catch errors

**Better approach**: Shared types

---

### 3. 🟡 **Inconsistent Naming** (MEDIUM PRIORITY)

**Problem**: Same concept has different names across files:

```typescript
onUpdateTitle; // QuarterlyGoal.tsx
onUpdateGoalTitle; // DailyGoalList.tsx
handleUpdateTitle; // WeekCardQuarterlyGoals.tsx
handleSaveTitle; // QuarterlyGoal.tsx
onSave; // GoalDetailsPopover.tsx
handleEditGoal; // useSummaryGoalActions.tsx
```

**Impact**:

- Cognitive overhead
- Harder to search/refactor
- Unclear intent

---

### 4. 🟡 **Multiple Duplicate Interfaces in Same File** (MEDIUM PRIORITY)

**Example**: `DailyGoalList.tsx` has the same signature **4 times**:

```typescript
export interface DailyGoalListProps {
  onUpdateGoalTitle: (
    goalId: Id<"goals">,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
}

export interface DailyGoalListContainerProps {
  onUpdateGoalTitle: (
    goalId: Id<"goals">,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
}

interface DailyGoalItemViewProps {
  onUpdateGoalTitle: (
    goalId: Id<"goals">,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
}

interface DailyGoalGroupProps {
  onUpdateGoalTitle: (
    goalId: Id<"goals">,
    title: string,
    details?: string,
    dueDate?: number
  ) => Promise<void>;
}
```

**Better**: Extract to shared type

---

### 5. 🟡 **Unclear Data Flow** (MEDIUM PRIORITY)

**Problem**: Hard to trace how data flows through the app

When debugging, we had to:

1. Add console logs to 4+ files
2. Manually trace the callback chain
3. Check each intermediate component

**Root cause**: Too many indirection layers with prop drilling

---

## Recommended Refactoring Strategy

### Phase 1: Create Shared Type Definitions (Quick Win - 2 hours)

**Goal**: Single source of truth for common types

```typescript
// New file: apps/webapp/src/models/goal-handlers.ts

import type { Id } from "@services/backend/convex/_generated/dataModel";

/**
 * Handler for updating a goal's title, details, and due date.
 * Used across all goal components.
 */
export type GoalUpdateHandler = (
  goalId: Id<"goals">,
  title: string,
  details?: string,
  dueDate?: number
) => Promise<void>;

/**
 * Handler for toggling goal completion status.
 */
export type GoalCompletionHandler = (isComplete: boolean) => Promise<void>;

/**
 * Props for components that display and edit goal details.
 */
export interface GoalDetailsHandlers {
  onSave: GoalUpdateHandler;
  onToggleComplete?: GoalCompletionHandler;
}
```

**Migration**:

1. Create shared types file
2. Update 3-4 high-traffic files first
3. Gradually migrate others

**Benefit**: Next time we add a parameter, we change **1 type** instead of 14 files

---

### Phase 2: Reduce Prop Drilling with Context (Medium effort - 1 day)

**Problem**: Goal actions passed through 3-5 layers

**Solution**: Use React Context for goal actions

```typescript
// New file: apps/webapp/src/contexts/GoalActionsContext.tsx

import { createContext, useContext } from "react";
import type { GoalUpdateHandler } from "@/models/goal-handlers";
import { useGoalActions } from "@/hooks/useGoalActions";

interface GoalActionsContextValue {
  updateGoal: GoalUpdateHandler;
  deleteGoal: (goalId: Id<"goals">) => Promise<void>;
  toggleCompletion: (
    goalId: Id<"goals">,
    weekNumber: number,
    isComplete: boolean
  ) => Promise<void>;
  // ... other actions
}

const GoalActionsContext = createContext<GoalActionsContextValue | null>(null);

export function GoalActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const actions = useGoalActions();

  const value = useMemo(
    () => ({
      updateGoal: async (goalId, title, details, dueDate) => {
        await actions.updateQuarterlyGoalTitle({
          goalId,
          title,
          details,
          dueDate,
        });
      },
      // ... wrap other actions
    }),
    [actions]
  );

  return (
    <GoalActionsContext.Provider value={value}>
      {children}
    </GoalActionsContext.Provider>
  );
}

export function useGoalActionsContext() {
  const context = useContext(GoalActionsContext);
  if (!context)
    throw new Error(
      "useGoalActionsContext must be used within GoalActionsProvider"
    );
  return context;
}
```

**Usage**:

```typescript
// Before (prop drilling):
<QuarterlyGoal onUpdateTitle={handleUpdateTitle} />;

// After (context):
function QuarterlyGoal({ goal }) {
  const { updateGoal } = useGoalActionsContext();
  // No more prop drilling!
}
```

**Benefits**:

- ✅ Eliminate 3-5 layers of prop passing
- ✅ Direct access to actions from any component
- ✅ Single provider at top level
- ✅ Much easier to add new parameters

**Tradeoff**:

- Context re-renders can be broader (mitigated with `useMemo`)
- Less explicit data flow (use TypeScript and good naming)

---

### Phase 3: Standardize Naming (Low effort - 2 hours)

**Create naming conventions**:

```typescript
// Component props (handlers passed down)
interface ComponentProps {
  onUpdateGoal: GoalUpdateHandler; // ✅ Consistent
  onDeleteGoal: (id: Id<"goals">) => Promise<void>;
  onToggleComplete: GoalCompletionHandler;
}

// Internal handlers (component functions)
function Component() {
  const handleUpdateGoal = async () => {
    /* ... */
  }; // ✅ handle* prefix
  const handleDeleteGoal = async () => {
    /* ... */
  };
}

// Hook returns (external API)
export function useGoalActions() {
  return {
    updateGoal: async () => {
      /* ... */
    }, // ✅ Verb, no prefix
    deleteGoal: async () => {
      /* ... */
    },
  };
}
```

**Convention**:

- Props: `on[Action]` - e.g., `onUpdateGoal`, `onDeleteGoal`
- Internal handlers: `handle[Action]` - e.g., `handleUpdateGoal`
- Hook functions: `[verb][Noun]` - e.g., `updateGoal`, `deleteGoal`

---

### Phase 4: Component Composition Over Props (Medium effort)

**Problem**: Components have too many responsibilities

**Example**: `GoalDetailsPopover` handles:

- Display
- Edit mode
- Form validation
- Save logic
- Child goal creation

**Better**: Composition with smaller components

```typescript
// Separate concerns
<GoalDetailsModal goal={goal}>
  <GoalDetailsDisplay goal={goal} />
  <GoalDetailsEditor initialValues={goal} onSave={handleSave} />
  <GoalChildrenSection parentGoal={goal} />
</GoalDetailsModal>
```

---

## Immediate Action Items (Priority Order)

### 🔥 **Critical (Do First)**

1. **Create shared types file** (`apps/webapp/src/models/goal-handlers.ts`)

   - Time: 1 hour
   - Impact: High
   - Risk: Low
   - Benefit: Prevents future similar bugs

2. **Add TypeScript strict mode checks**
   - Enable `strict: true` in `tsconfig.json` if not already
   - This would have caught missing parameters
   - Time: 2 hours (fixing errors)
   - Impact: High

### 📋 **High Priority (Do Soon)**

3. **Introduce GoalActionsContext**

   - Time: 4-6 hours
   - Impact: High
   - Risk: Medium (requires testing)
   - Reduces prop drilling significantly

4. **Consolidate duplicate interfaces**
   - Start with `DailyGoalList.tsx` (4 duplicates)
   - Time: 2 hours
   - Impact: Medium

### 📌 **Medium Priority (Do When Refactoring)**

5. **Standardize naming conventions**

   - Update incrementally during feature work
   - Time: Ongoing
   - Impact: Medium

6. **Extract business logic from components**
   - Create custom hooks for complex logic
   - Time: Ongoing
   - Impact: Medium

---

## How This Prevents Future Bugs

### With Current Approach ❌

```
Add new parameter → Update:
✓ Backend mutation (1 file)
✓ useGoalActions hook (1 file)
✗ WeekCardQuarterlyGoals interface
✗ QuarterlyGoal interface
✗ QuarterlyGoal handler
✗ DailyGoalList interface (×4!)
✗ DayContainer interface
✗ ... (8 more files)
= 14+ files to update manually
```

### With Shared Types + Context ✅

```
Add new parameter → Update:
✓ Backend mutation (1 file)
✓ Shared type definition (1 line in 1 file)
✓ Context implementation (1 file)
= 2-3 files total, TypeScript catches rest
```

---

## Metrics

### Current State

- **Files touched for parameter change**: 14+
- **Duplicate type definitions**: 14+
- **Prop drilling depth**: 3-5 layers
- **Type safety**: Partial (masked by `as any`)

### After Refactoring

- **Files touched for parameter change**: 2-3
- **Duplicate type definitions**: 0
- **Prop drilling depth**: 0-1 layers
- **Type safety**: Full (no workarounds needed)

---

## Additional Benefits

1. **Faster feature development**

   - No need to trace callback chains
   - Direct access to actions

2. **Better testing**

   - Mock context once instead of props in every test
   - Easier to test components in isolation

3. **Improved onboarding**

   - Clearer architecture
   - Easier to understand data flow
   - Shared types serve as documentation

4. **Future-proof**
   - Easier to migrate to other state management (Zustand, Redux)
   - Context can be swapped out incrementally

---

## Conclusion

The due date bug was a symptom of deeper architectural issues:

1. **Prop drilling** created a fragile callback chain
2. **Type fragmentation** meant no single source of truth
3. **Optional parameters** let bugs slip through TypeScript

**The fix is straightforward**:

- Phase 1: Shared types (quick win)
- Phase 2: Context for actions (eliminates prop drilling)
- Phase 3: Naming standards (ongoing)

This will reduce similar bugs from **14+ file changes** to **2-3 file changes**, with full TypeScript protection.
