# Architecture: Drag-and-Drop for Quarterly View Goals

## Changes Overview

This feature extends the existing `@dnd-kit` setup in `MultiWeekLayout.tsx` to enable dragging weekly goals between weeks and reparenting them to different quarterly goals. Changes are primarily in the presentation layer with one new backend mutation.

## Current Architecture

```
MultiWeekLayout
├── DndContext (already exists with MouseSensor)
├── MultiWeekGrid
│   └── WeekCardContent (per week)
│       └── WeekCard
│           ├── WeekCardQuarterlyGoals
│           │   └── QuarterlyGoal (with nested WeeklyGoal components)
│           ├── WeekCardWeeklyGoals
│           └── WeekCardDailyGoals
```

The existing `DndContext` provides the infrastructure, but no draggable/droppable components are implemented yet.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Library | `@dnd-kit` (already installed) | Already in place, well-tested, accessible |
| Touch Support | Desktop-only | Avoids mobile UX issues, faster to ship |
| Drop Zones | Week columns + Quarterly goal sections | Supports both move and reparent |
| Drag Handle | Grip icon on goal cards | Clear affordance, not full card |
| Optimistic Updates | Client-side state | Immediate feedback before server response |
| Backend | Use existing `moveWeeklyGoalToWeek` + new `updateGoalParent` | Minimal backend changes |

## New Components

### DraggableWeeklyGoal

Wrapper component that makes a weekly goal card draggable.

**File:** `apps/webapp/src/components/molecules/goal/DraggableWeeklyGoal.tsx`

```tsx
interface DraggableWeeklyGoalProps {
  goal: GoalWithDetailsAndChildren;
  children: React.ReactNode;
}
```

### DroppableWeekColumn

Wrapper component that makes a week column a valid drop zone.

**File:** `apps/webapp/src/components/molecules/multi-week/DroppableWeekColumn.tsx`

```tsx
interface DroppableWeekColumnProps {
  weekNumber: number;
  year: number;
  quarter: number;
  children: React.ReactNode;
}
```

### DroppableQuarterlyGoal

Wrapper component that makes a quarterly goal section a valid drop zone for reparenting.

**File:** `apps/webapp/src/components/molecules/goal/DroppableQuarterlyGoal.tsx`

```tsx
interface DroppableQuarterlyGoalProps {
  quarterlyGoalId: Id<'goals'>;
  children: React.ReactNode;
}
```

### DragHandle

Visual grip icon component shown on desktop only.

**File:** `apps/webapp/src/components/atoms/DragHandle.tsx`

```tsx
interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap;
}
```

## Modified Components

### MultiWeekLayout

**File:** `apps/webapp/src/components/molecules/multi-week/MultiWeekLayout.tsx`

**Changes:**
1. Add `TouchSensor` alongside `MouseSensor` (for future mobile support)
2. Add `onDragEnd` handler to process drop events
3. Add `onDragStart` and `onDragCancel` handlers for state management
4. Add drag overlay for visual feedback during drag
5. Wrap content in `DndContext` collision detection

### WeekCard

**File:** `apps/webapp/src/components/molecules/week/WeekCard.tsx`

**Changes:**
1. Wrap with `DroppableWeekColumn`
2. Pass week context (year, quarter, weekNumber) to droppable

### WeeklyGoal (or equivalent goal card component)

**File:** To be identified - component rendering weekly goal cards

**Changes:**
1. Wrap with `DraggableWeeklyGoal`
2. Add `DragHandle` component (hidden on touch devices)
3. Apply drag styles when being dragged

### QuarterlyGoal section

**File:** `apps/webapp/src/components/organisms/WeekCardQuarterlyGoals.tsx`

**Changes:**
1. Wrap each quarterly goal section with `DroppableQuarterlyGoal`
2. Add visual highlighting when a draggable is over

## New Contracts

### DragData (Drag operation payload)

```typescript
interface GoalDragData {
  type: 'weekly-goal';
  goalId: Id<'goals'>;
  sourceWeek: {
    year: number;
    quarter: number;
    weekNumber: number;
  };
  parentId: Id<'goals'>; // Current quarterly goal parent
}
```

### DropData (Drop zone identification)

```typescript
interface WeekDropData {
  type: 'week-column';
  year: number;
  quarter: number;
  weekNumber: number;
}

interface QuarterlyGoalDropData {
  type: 'quarterly-goal';
  quarterlyGoalId: Id<'goals'>;
}

type DropData = WeekDropData | QuarterlyGoalDropData;
```

### Move Result Types

```typescript
interface MoveGoalResult {
  success: boolean;
  newGoalId?: Id<'goals'>;
  error?: string;
}

interface ReparentGoalResult {
  success: boolean;
  error?: string;
}
```

## New Backend Mutation

### updateGoalParent

Changes the parent of a goal (reparenting).

**File:** `services/backend/convex/goal.ts`

```typescript
export const updateGoalParent = mutation({
  args: {
    ...SessionIdArg,
    goalId: v.id('goals'),
    newParentId: v.id('goals'),
  },
  handler: async (ctx, args): Promise<ReparentGoalResult> => {
    // 1. Auth check
    // 2. Validate goal exists and user owns it
    // 3. Validate new parent exists and is correct depth
    // 4. Validate new parent is in same quarter
    // 5. Update parentId and inPath fields
    // 6. Return success
  },
});
```

## Data Flow

### Week-to-Week Move

```
User drags weekly goal
        ↓
DndContext onDragStart (set drag state)
        ↓
Drag overlay shows dragged goal
        ↓
User drops on different week column
        ↓
DndContext onDragEnd
        ↓
Extract GoalDragData and WeekDropData
        ↓
Optimistic update (remove from source, add to target)
        ↓
Call moveWeeklyGoalToWeek mutation
        ↓
Server confirms, data refetches
```

### Reparenting

```
User drags weekly goal
        ↓
DndContext onDragStart (set drag state)
        ↓
Drag overlay shows dragged goal
        ↓
User drops on quarterly goal section
        ↓
DndContext onDragEnd
        ↓
Extract GoalDragData and QuarterlyGoalDropData
        ↓
Optimistic update (move goal under new parent in UI)
        ↓
Call updateGoalParent mutation
        ↓
Server confirms, data refetches
```

## Utility Functions

### isTouchDevice

Detects touch devices to hide drag handles.

```typescript
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
```

### Custom Hook: useDragAndDrop

Encapsulates drag-and-drop logic for the quarterly view.

```typescript
interface UseDragAndDropReturn {
  isDragging: boolean;
  activeGoal: GoalWithDetailsAndChildren | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
}

function useDragAndDrop(): UseDragAndDropReturn;
```

## Integration Points

### Existing Mutations Used

- `moveWeeklyGoalToWeek` - Already exists for week-to-week movement

### New Mutations Required

- `updateGoalParent` - New mutation for reparenting

### Context Dependencies

- `WeekContext` - For week information
- `useSessionMutation` - For calling backend mutations
- `useMemo` / `useCallback` - For performance optimization
