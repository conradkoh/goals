# Sub-Goals Rendering Comparison: Quarterly/Weekly/Daily vs Adhoc Goals

## Overview

This document analyzes how different goal types handle sub-goal rendering in their detail popovers. The hierarchy has two parallel systems that now use consistent `subGoals` terminology.

**Update**: As of the latest changes, both hierarchies now:
- ✅ Use `subGoals` terminology (avoiding confusion with React children)
- ✅ Support filtering via `subGoalsToRender` prop
- ✅ Maintain backward compatibility with `parentGoal.children` access

## Hierarchy Structure

```
Quarterly Goals (depth=0)
  └─ Weekly Goals (depth=1)
      └─ Daily Goals (depth=2)

Adhoc Goals (depth=-1, but has adhoc.level)
  └─ Adhoc Sub-goals (nested, tracked via parentId)
      └─ Adhoc Sub-sub-goals (nested, tracked via parentId)
          └─ ... (up to 3 levels soft limit)
```

---

## Component Architecture Comparison

### 1. **Quarterly/Weekly/Daily Goals** (Context-Based with Filtering Support)

#### Property Names
| Level | Component | Sub-Goals Property | Sub-Goals Type |
|---|---|---|---|
| Quarterly | `QuarterlyGoalPopover` | `goal.children` | `Weekly goals` |
| Weekly | `WeeklyGoalPopover` | `goal.children` | `Daily goals` |
| Daily | `DailyGoalPopover` | _(no sub-goals)_ | - |

#### How Sub-Goals are Accessed
- **Source**: `goal.children` from `GoalContext` 
- **Prop**: NOT passed as prop by default - accessed via context using `useGoalContext()`
- **Filtering**: NEW - Supports `subGoalsToRender` prop for filtered display
- **Decision Logic**: 
  - Check `goal.children && goal.children.length > 0`
  - Determined by `parentGoal.depth` (0 = quarterly, 1 = weekly)

#### Sub-Goal Rendering Component
- **Component**: `GoalDetailsChildrenList`
- **Location**: `goal-details-popover/view/components/GoalDetailsChildrenList.tsx`
- **Props**:
  ```typescript
  {
    parentGoal: GoalWithDetailsAndChildren,     // Full goal object with children
    title: string,                               // "Weekly Goals" or "Daily Goals"
    subGoalsToRender?: GoalWithDetailsAndChildren[] // NEW: Optional filtered sub-goals
  }
  ```

#### Rendering Logic (GoalDetailsChildrenList)
```typescript
// Uses subGoalsToRender if provided, otherwise falls back to goal.children
const subGoals = subGoalsToRender !== undefined ? subGoalsToRender : parentGoal.children;

{subGoals.map((child) => (
  <GoalProvider key={child._id} goal={child}>
    {isQuarterlyParent ? (
      <WeeklyGoalTaskItem />
    ) : (
      <DailyGoalTaskItem />
    )}
    
    {/* Grandchildren for quarterly goals */}
    {isQuarterlyParent && child.children?.length > 0 && (
      <div className="ml-6 ...">
        {child.children.map((grandchild) => (
          <GoalProvider key={grandchild._id} goal={grandchild}>
            <DailyGoalTaskItem />
          </GoalProvider>
        ))}
      </div>
    )}
  </GoalProvider>
))}
```

**Key Characteristics:**
- ✅ Uses `goal.children` property consistently at data level
- ✅ Context-based: child components get goal via `useGoalContext()`
- ✅ Shared rendering component for all hierarchy levels
- ✅ Automatic grandchild rendering for quarterly → weekly → daily
- ✅ NEW: Supports filtering via `subGoalsToRender` prop
- ✅ Backward compatible: defaults to `parentGoal.children` if no filter provided

---

### 2. **Adhoc Goals** (Prop-Based)

#### Property Names
| Level | Component | Sub-Goals Property | Sub-Goals Type |
|---|---|---|---|
| Adhoc (root) | `AdhocGoalPopover` | `subGoals` (prop) | `AdhocGoalWithChildren[]` |
| Adhoc (nested) | `AdhocGoalPopover` | `subGoals` (prop) | `AdhocGoalWithChildren[]` |

#### How Sub-Goals are Accessed
- **Source**: `subGoals` prop passed explicitly
- **Prop**: Passed as explicit prop through component tree
- **Decision Logic**: 
  - Check `subGoals !== undefined || onCreateChild` 
  - Uses `depth` parameter to track nesting level

#### Sub-Goal Rendering Component
- **Component**: `AdhocSubGoalsList`
- **Location**: `goal-details-popover/view/components/AdhocSubGoalsList.tsx`
- **Props**:
  ```typescript
  {
    subGoals: AdhocGoalWithChildren[],         // Array of sub-goals (EXPLICIT)
    currentDepth: number,                      // 0 = root, 1 = sub, etc.
    parentId: Id<'goals'>,                     // For creating new sub-goals
    onCompleteChange?: (goalId, isComplete) => void,
    onUpdate?: (goalId, title, details, ...) => void,
    onDelete?: (goalId) => void,
    onCreateChild?: (parentId, title) => Promise<void>
  }
  ```

#### Rendering Logic (AdhocSubGoalsList)
```typescript
// Maps over explicit subGoals prop
{allSubGoals.map((subGoal) => (
  <_SubGoalItem
    key={subGoal._id}
    goal={subGoal}                    // Goal passed as PROP, not context
    onCompleteChange={handleCompleteChange}
    onUpdate={onUpdate}
    onDelete={onDelete}
    onCreateChild={onCreateChild}
    depth={currentDepth + 1}
  />
))}

// _SubGoalItem recursively renders nested children
function _SubGoalItem({ goal, depth, ... }) {
  return (
    <GoalProvider goal={goalForProvider}>
      <div>
        {/* Render current goal */}
        <AdhocGoalPopover
          subGoals={goal.children}    // Pass children explicitly
          depth={depth}
          ...
        />
        
        {/* Recursive rendering happens inside AdhocGoalPopover */}
      </div>
    </GoalProvider>
  );
}
```

**Key Characteristics:**
- ✅ Uses `subGoals` prop name (explicit)
- ✅ Prop-based: children passed through component hierarchy
- ✅ Supports filtering: can pass filtered `subGoals` array
- ✅ Recursive: each level handles its own children
- ✅ Depth tracking with soft limit (3 levels)
- ✅ Create input at every level (if depth allows)
- ❌ Different naming from standard hierarchy (`subGoals` vs `children`)
- ❌ Separate rendering component from quarterly/weekly/daily

---

## Filtering Behavior Comparison

### Quarterly/Weekly/Daily Goals
```typescript
// In GoalDetailsChildrenList - NOW supports filtering
// Uses subGoalsToRender if provided, otherwise falls back to parentGoal.children
const subGoals = subGoalsToRender !== undefined ? subGoalsToRender : parentGoal.children;

{subGoals.map((child) => (
  // Renders filtered or all sub-goals based on prop
))}
```
**Result**: ✅ Can now filter which sub-goals to show via `subGoalsToRender` prop.

### Adhoc Goals
```typescript
// In AdhocGoalPopover - Can control which sub-goals to show
<AdhocSubGoalsList
  subGoals={subGoals || []}         // Can pass filtered array
  currentDepth={depth}
  ...
/>

// In AdhocGoalItem (used in OnFireGoalsSection) - Supports filtering
<AdhocGoalItem
  goal={goal}
  childrenToRender={filteredChildren}  // Override which children to render
  ...
/>
```
**Result**: ✅ Can filter sub-goals for display while preserving full children for modal.

---

## Property Name Consistency

### Standard Hierarchy
| Component | Sub-Goals Prop Name | Source |
|---|---|---|
| QuarterlyGoalPopover | `goal.children` | Context |
| WeeklyGoalPopover | `goal.children` | Context |
| DailyGoalPopover | _(no sub-goals)_ | - |
| GoalDetailsChildrenList | `subGoalsToRender` (optional) | Prop (override) |
| GoalDetailsChildrenList | `parentGoal.children` | Prop (default) |

### Adhoc Hierarchy
| Component | Sub-Goals Prop Name | Source |
|---|---|---|
| AdhocGoalPopover | `subGoals` | Prop (explicit) |
| AdhocSubGoalsList | `subGoals` | Prop (explicit) |
| AdhocGoalItem | `goal.children` + `childrenToRender` | Prop (goal object + override) |
| _SubGoalItem | `goal.children` | Prop (from goal object) |

**Naming Consistency:**
- Standard hierarchy: Uses `children` at data level, `subGoalsToRender` for filtering
- Adhoc hierarchy: Uses `subGoals` at prop level, `children` in nested items
- Both now support filtering through similar patterns

---

## Data Flow Comparison

### Quarterly/Weekly/Daily (Context Flow)
```
Database → useWeek() hook → GoalContext → goal.children
                                              ↓
                              QuarterlyGoalPopover (reads from context)
                                              ↓
                              GoalDetailsChildrenList (receives parentGoal prop)
                                              ↓
                              Maps over parentGoal.children
                                              ↓
                              WeeklyGoalTaskItem (reads from context)
```

### Adhoc (Prop Flow)
```
Database → useAdhocGoalsForWeek() → hierarchicalAdhocGoals
                                              ↓
                              Filter in OnFireGoalsSection
                                              ↓
                              AdhocGoalItem (receives goal + childrenToRender)
                                              ↓
                              AdhocGoalPopover (receives subGoals prop)
                                              ↓
                              AdhocSubGoalsList (receives subGoals prop)
                                              ↓
                              _SubGoalItem (receives goal prop)
                                              ↓
                              Recursive AdhocGoalPopover (receives goal.children as subGoals)
```

---

## Key Differences Summary

| Aspect | Quarterly/Weekly/Daily | Adhoc Goals |
|---|---|---|
| **Sub-Goals Prop Name** | `subGoalsToRender` (optional) | `subGoals` (required) |
| **Data Passing** | Context-based | Prop-based |
| **Filtering Support** | ✅ Yes (via `subGoalsToRender`) | ✅ Yes (via `childrenToRender`) |
| **Rendering Component** | Shared (`GoalDetailsChildrenList`) | Dedicated (`AdhocSubGoalsList`) |
| **Recursion** | Handled explicitly (grandchildren) | Recursive component structure |
| **Depth Tracking** | Implicit (via `depth` field) | Explicit (`depth` parameter) |
| **Create Input** | Only at parent level | At every level (up to limit) |
| **Child Access** | `useGoalContext()` in children | Prop drilling |

---

## Ease of Working with Both Systems

### ✅ Strengths
1. **Both use `goal.children` at the data level** - The actual goal objects use `.children` consistently
2. **Both support filtering** - Standard hierarchy via `subGoalsToRender`, Adhoc via `childrenToRender`
3. **Similar component patterns** - Both have a popover → sub-goals list structure
4. **Consistent rendering of goal items** - Both use task item components (Weekly/Daily vs Adhoc)
5. **Shared infrastructure** - Both use `GoalProvider`, `FireGoalsProvider`, `GoalActionsProvider`
6. **Terminology alignment** - Using `subGoals` terminology avoids confusion with React children

### ⚠️ Remaining Differences
1. **Different data flow patterns** - Context vs Props serves different architectural purposes
2. **Separate rendering components** - `GoalDetailsChildrenList` vs `AdhocSubGoalsList`
3. **Prop naming** - `subGoalsToRender` vs `childrenToRender` (minor difference)

---

## Conclusion

The two hierarchies now work consistently with aligned patterns:

- **Standard hierarchy (Quarterly/Weekly/Daily)**: Context-based with optional filtering via `subGoalsToRender`
- **Adhoc hierarchy**: Prop-based with filtering via `childrenToRender`

**Recent Improvements:**
1. ✅ Added filtering support to standard hierarchy
2. ✅ Uses `subGoals` terminology in documentation (avoiding React children confusion)
3. ✅ Both systems now support selective sub-goal rendering

The different data flow patterns (context vs props) remain intentional design choices that serve each system's requirements well. The minor prop naming difference (`subGoalsToRender` vs `childrenToRender`) maintains clarity about which hierarchy is being used.

