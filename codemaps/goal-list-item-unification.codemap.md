# Goal List Item Unification Codemap

## Title

Unified Goal List Item Component with Pending Update Support

## Description

This codemap documents the refactoring of multiple goal list item implementations into a single, composable component system. The primary goals are:

1. **Reduce code duplication** across WeeklyGoalTaskItem, DailyGoalTaskItem, AdhocGoalItem, and QuarterlyGoal
2. **Add `onUpdatePending` functionality** to show loading indicators when updates are in flight
3. **Ensure proper error handling** when optimistic updates fail (popover closes optimistically but promise is tracked)
4. **Follow composable component pattern** as defined in `docs/conventions/component-structure.md`

### Problem Statement

Currently, the edit popover closes optimistically but the promise is fire-and-forget. If the backend call fails, the user sees a toast but the UI has already updated. The goal item should show a pending/loading state until the promise resolves.

## Implementations to Refactor

### 1. WeeklyGoalTaskItem

**File**: `apps/webapp/src/components/molecules/day-of-week/components/WeeklyGoalTaskItem.tsx`

**Current Features**:

- Checkbox for completion toggle
- WeeklyGoalPopover as title/trigger
- Fire icon status
- Pending icon status
- GoalEditPopover (pencil icon)
- DeleteGoalIconButton
- Spinner for optimistic state (via `isOptimistic` flag)

**Context Dependencies**:

- `useGoalContext()` - gets goal data
- `useGoalActionsContext()` - gets `onUpdateGoal`
- `useFireGoalStatus()` - fire status

**UI Structure**:

```tsx
<div className="weekly-goal-item ml-1 group rounded-sm hover:bg-gray-50/50">
  <div className="text-sm flex items-center gap-2 group/title">
    <Checkbox />
    <WeeklyGoalPopover triggerClassName="..." />
    <div className="flex items-center gap-1">
      {isOptimistic ? (
        <Spinner />
      ) : (
        <>
          <FireIcon />
          <PendingIcon />
          <GoalEditPopover trigger={<Edit2 />} />
          <DeleteGoalIconButton />
        </>
      )}
    </div>
  </div>
</div>
```

### 2. DailyGoalTaskItem (Deleted - needs recreation)

**Former File**: `apps/webapp/src/components/organisms/DailyGoalTaskItem.tsx`

**Current Features** (from git history):

- Checkbox for completion toggle
- DailyGoalPopover as title/trigger with day-of-week selector
- Fire icon status
- Pending icon status
- GoalEditPopover (pencil icon)
- DeleteGoalIconButton
- Spinner for optimistic state
- Day-of-week move selector inside popover

**Context Dependencies**:

- `useGoalContext()` - gets goal data
- `useGoalActionsContext()` - gets `onUpdateGoal`
- `useFireGoalStatus()` - fire status
- `usePendingGoalStatus()` - pending status

**UI Structure**:

```tsx
<div className="daily-goal-item group hover:bg-gray-50/50 rounded-sm">
  <div className="text-sm flex items-center gap-2 group/title">
    <Checkbox />
    <DailyGoalPopover
      triggerClassName="..."
      additionalContent={<DaySelector />}
    />
    <div className="flex items-center gap-1">
      {isOptimistic ? (
        <Spinner />
      ) : (
        <>
          <FireIcon />
          <PendingIcon />
          <GoalEditPopover trigger={<Edit2 />} />
          <DeleteGoalIconButton />
        </>
      )}
    </div>
  </div>
</div>
```

### 3. AdhocGoalItem

**File**: `apps/webapp/src/components/molecules/AdhocGoalItem.tsx`

**Current Features**:

- Checkbox for completion toggle
- AdhocGoalPopover as title/trigger
- Fire icon status
- Pending icon status
- GoalEditPopover (pencil icon) with domain selector
- Delete button (inline, not DeleteGoalIconButton)
- Spinner for optimistic state
- Domain badge display
- **Recursive children rendering**

**Prop-based (NOT context)**:

- `goal` - goal data passed as prop
- `onCompleteChange` - callback
- `onUpdate` - callback
- `onDelete` - callback
- `onCreateChild` - callback for nested goals

**UI Structure**:

```tsx
<GoalProvider goal={goalWithChildren}>
  <div className="flex items-start gap-2 group/task rounded-sm hover:bg-accent/50 transition-colors py-1">
    <Checkbox />
    <div className="flex-1 min-w-0 flex items-center justify-between group/title">
      <AdhocGoalPopover ... />
      <div className="flex items-center gap-1 flex-shrink-0">
        {isOptimistic ? <Spinner /> : (
          <>
            <FireIcon />
            <PendingIcon />
            <GoalEditPopover trigger={<Edit2 />} showDomainSelector />
            <button onClick={handleDelete}><Trash2 /></button>
          </>
        )}
      </div>
    </div>
  </div>
  {/* Recursive children */}
</GoalProvider>
```

### 4. QuarterlyGoal

**File**: `apps/webapp/src/components/organisms/QuarterlyGoal.tsx`

**Current Features**:

- GoalStarPin toggle (star/pin buttons)
- QuarterlyGoalPopover as title/trigger
- GoalEditPopover (pencil icon)
- DeleteGoalIconButton
- Completion state styling (green background)

**Context Dependencies**:

- `useGoalContext()` - gets goal data

**Props**:

- `onToggleStatus` - star/pin callback
- `onUpdateGoal` - update callback

**UI Structure**:

```tsx
<div className="group px-2 py-1 rounded-sm {completion-bg-classes}">
  <div className="flex items-center gap-2 group/title">
    <GoalStarPinContainer>
      <GoalStarPin ... />
    </GoalStarPinContainer>
    <QuarterlyGoalPopover triggerClassName="..." />
    <GoalEditPopover trigger={<Edit2 />} />
    <DeleteGoalIconButton />
  </div>
</div>
```

### 5. DailyGoalGroup Header Items

**File**: `apps/webapp/src/components/organisms/DailyGoalGroup.tsx`

**Note**: Uses GoalEditPopover directly on quarterly and weekly goal headers within the group.

## Common Patterns Identified

### Shared UI Elements

1. **Checkbox** - completion toggle (all except quarterly headers)
2. **Goal Popover** - different variants (Quarterly, Weekly, Daily, Adhoc)
3. **Fire Icon** - marks urgent goals
4. **Pending Icon** - marks waiting goals
5. **Edit Popover** - pencil icon trigger
6. **Delete Button** - trash icon or DeleteGoalIconButton
7. **Spinner** - shown during optimistic updates

### Shared Behaviors

1. Toggle completion clears fire status
2. Optimistic state shows spinner instead of action buttons
3. Edit popover closes optimistically, awaits save
4. Due date styling applied to title

### Differences by Variant

| Feature         | Weekly | Daily           | Adhoc      | Quarterly |
| --------------- | ------ | --------------- | ---------- | --------- |
| Checkbox        | ✅     | ✅              | ✅         | ❌        |
| Star/Pin        | ❌     | ❌              | ❌         | ✅        |
| Domain Badge    | ❌     | ❌              | ✅         | ❌        |
| Day Selector    | ❌     | ✅ (in popover) | ❌         | ❌        |
| Nested Children | ❌     | ❌              | ✅         | ❌        |
| Context-based   | ✅     | ✅              | ❌ (props) | ✅        |

## Proposed Component Architecture

### Directory Structure

```
components/molecules/goal-list-item/
├── index.ts                     # Entry point with documentation
├── variants/                    # Pre-composed variants
│   ├── index.ts
│   ├── WeeklyGoalItem.tsx      # Weekly goal variant
│   ├── DailyGoalItem.tsx       # Daily goal variant
│   ├── AdhocGoalItem.tsx       # Adhoc goal variant
│   └── QuarterlyGoalItem.tsx   # Quarterly goal variant
└── view/                        # Composable building blocks
    ├── index.ts
    ├── GoalListItemView.tsx    # Main container component
    └── components/
        ├── index.ts
        ├── GoalCheckbox.tsx
        ├── GoalTitleTrigger.tsx
        ├── GoalActionButtons.tsx
        ├── GoalStatusIcons.tsx
        ├── GoalPendingIndicator.tsx   # NEW: Shows loading state
        └── GoalListItemContext.tsx    # Context for pending state
```

### Key New Interface: `onUpdatePending`

```typescript
/**
 * Handler for tracking pending updates.
 * Called when an update starts, receives the promise to track.
 * The goal list item shows a loading indicator until the promise resolves.
 */
export type GoalUpdatePendingHandler = (updatePromise: Promise<void>) => void;

export interface GoalListItemHandlers {
  /** Handler for updating goal properties */
  onUpdateGoal: GoalUpdateHandler;

  /** Handler for tracking pending updates - shows loading indicator */
  onUpdatePending?: GoalUpdatePendingHandler;

  /** Handler for deleting the goal */
  onDeleteGoal: GoalDeleteHandler;

  /** Optional handler for toggling completion */
  onToggleComplete?: GoalCompletionHandler;
}
```

### Usage Example

```tsx
// In GoalEditPopover or any edit component
const handleSave = useCallback(async () => {
  if (!title.trim()) return;

  // Close popover optimistically
  setIsOpen(false);

  // Create the update promise
  const updatePromise = onSave(
    title.trim(),
    details,
    dueDate?.getTime(),
    domainId
  );

  // Notify parent of pending update (shows loading indicator)
  onUpdatePending?.(updatePromise);

  try {
    await updatePromise;
  } catch (error) {
    toast({
      title: "Failed to save goal",
      description:
        error instanceof Error ? error.message : "An unexpected error occurred",
      variant: "destructive",
    });
  }
}, [title, details, dueDate, domainId, onSave, onUpdatePending]);
```

### GoalListItemContext

```typescript
interface _GoalListItemContextType {
  /** Whether an update is currently pending */
  isPending: boolean;

  /** Register a pending update promise */
  setPendingUpdate: (promise: Promise<void>) => void;
}

const _GoalListItemContext = createContext<
  _GoalListItemContextType | undefined
>(undefined);

export function useGoalListItemContext(): _GoalListItemContextType {
  const context = useContext(_GoalListItemContext);
  if (context === undefined) {
    throw new Error(
      "useGoalListItemContext must be used within a GoalListItemProvider"
    );
  }
  return context;
}

export function GoalListItemProvider({ children }: { children: ReactNode }) {
  const [isPending, setIsPending] = useState(false);

  const setPendingUpdate = useCallback((promise: Promise<void>) => {
    setIsPending(true);
    promise.finally(() => setIsPending(false));
  }, []);

  const value = useMemo(
    () => ({ isPending, setPendingUpdate }),
    [isPending, setPendingUpdate]
  );

  return (
    <_GoalListItemContext.Provider value={value}>
      {children}
    </_GoalListItemContext.Provider>
  );
}
```

## Migration Plan

### Phase 1: Create New Component System

1. Create `goal-list-item/` directory structure
2. Implement `GoalListItemContext` with pending state tracking
3. Implement base `GoalListItemView` component
4. Implement composable pieces (Checkbox, TitleTrigger, ActionButtons, StatusIcons, PendingIndicator)
5. Write unit tests for pending update behavior

### Phase 2: Create Variants

1. Create `WeeklyGoalItem` variant using composable pieces
2. Create `DailyGoalItem` variant (recreate deleted component)
3. Create `AdhocGoalItem` variant (with nested children support)
4. Create `QuarterlyGoalItem` variant (with star/pin support)

### Phase 3: Migrate Existing Usage

1. Replace `WeeklyGoalTaskItem` with new `WeeklyGoalItem`
2. Replace deleted `DailyGoalTaskItem` imports with new `DailyGoalItem`
3. Replace `AdhocGoalItem` with new version
4. Replace `QuarterlyGoal` with new `QuarterlyGoalItem`
5. Update all consumer components to pass `onUpdatePending`

### Phase 4: Update Edit Components

1. Update `GoalEditPopover` to call `onUpdatePending`
2. Update `GoalEditModal` to call `onUpdatePending`
3. Update all goal popover variants to propagate `onUpdatePending`

## Files to Modify

### New Files

- `apps/webapp/src/components/molecules/goal-list-item/index.ts`
- `apps/webapp/src/components/molecules/goal-list-item/variants/index.ts`
- `apps/webapp/src/components/molecules/goal-list-item/variants/WeeklyGoalItem.tsx`
- `apps/webapp/src/components/molecules/goal-list-item/variants/DailyGoalItem.tsx`
- `apps/webapp/src/components/molecules/goal-list-item/variants/AdhocGoalItem.tsx`
- `apps/webapp/src/components/molecules/goal-list-item/variants/QuarterlyGoalItem.tsx`
- `apps/webapp/src/components/molecules/goal-list-item/view/index.ts`
- `apps/webapp/src/components/molecules/goal-list-item/view/GoalListItemView.tsx`
- `apps/webapp/src/components/molecules/goal-list-item/view/components/index.ts`
- `apps/webapp/src/components/molecules/goal-list-item/view/components/GoalCheckbox.tsx`
- `apps/webapp/src/components/molecules/goal-list-item/view/components/GoalTitleTrigger.tsx`
- `apps/webapp/src/components/molecules/goal-list-item/view/components/GoalActionButtons.tsx`
- `apps/webapp/src/components/molecules/goal-list-item/view/components/GoalStatusIcons.tsx`
- `apps/webapp/src/components/molecules/goal-list-item/view/components/GoalPendingIndicator.tsx`
- `apps/webapp/src/components/molecules/goal-list-item/view/components/GoalListItemContext.tsx`

### Files to Update

- `apps/webapp/src/components/atoms/GoalEditPopover.tsx` - add `onUpdatePending` prop
- `apps/webapp/src/models/goal-handlers.ts` - add `GoalUpdatePendingHandler` type

### Files to Deprecate/Remove (after migration)

- `apps/webapp/src/components/molecules/day-of-week/components/WeeklyGoalTaskItem.tsx` - ✅ Migrated (re-exports)
- `apps/webapp/src/components/molecules/AdhocGoalItem.tsx` - ✅ Migrated (re-exports with nested children support)
- `apps/webapp/src/components/organisms/QuarterlyGoal.tsx` - ✅ Migrated (re-exports)
- `apps/webapp/src/components/organisms/DailyGoalTaskItem.tsx` - ✅ Migrated (re-exports)

## Contracts

### GoalUpdatePendingHandler

```typescript
// From apps/webapp/src/models/goal-handlers.ts (NEW)
/**
 * Handler for tracking pending updates.
 * Called when an update starts, receives the promise to track.
 * The goal list item shows a loading indicator until the promise resolves.
 *
 * @example
 * const handleSave = async () => {
 *   const updatePromise = onSave(title, details, dueDate);
 *   onUpdatePending?.(updatePromise);
 *   await updatePromise;
 * };
 */
export type GoalUpdatePendingHandler = (updatePromise: Promise<void>) => void;
```

### GoalListItemContextValue

```typescript
// From goal-list-item/view/components/GoalListItemContext.tsx (NEW)
interface _GoalListItemContextType {
  /** Whether an update is currently pending */
  isPending: boolean;

  /** Register a pending update promise */
  setPendingUpdate: GoalUpdatePendingHandler;
}
```

### GoalEditPopoverProps (Updated)

```typescript
// From apps/webapp/src/components/atoms/GoalEditPopover.tsx (UPDATED)
interface GoalEditPopoverProps {
  title: string;
  details?: string;
  onSave: (
    title: string,
    details: string,
    dueDate?: number,
    domainId?: Id<"domains"> | null
  ) => Promise<void>;
  trigger?: React.ReactNode;
  initialDueDate?: number;
  initialDomainId?: Id<"domains"> | null;
  showDomainSelector?: boolean;
  /** NEW: Called with the update promise for tracking pending state */
  onUpdatePending?: GoalUpdatePendingHandler;
}
```
