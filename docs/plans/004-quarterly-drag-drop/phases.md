# Implementation Phases: Drag-and-Drop for Quarterly View Goals

## Phase Overview

| Phase | Description | Estimated Effort |
|-------|-------------|------------------|
| Phase 1 | Core DnD infrastructure | 2-3 hours |
| Phase 2 | Week-to-week movement | 2-3 hours |
| Phase 3 | Reparenting to quarterly goals | 2-3 hours |
| Phase 4 | Polish & edge cases | 1-2 hours |

**Total Estimated: 7-11 hours**

## Design Decisions (From Discussion)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Touch Support | Desktop-only (Option A) | Faster to ship, avoids mobile UX issues |
| Scope | Weekly goals only | Daily goals move with parent automatically |
| Reparenting | Allowed (same week) | Natural user expectation |
| Backend | Existing mutation + 1 new mutation | Minimal changes |

## Phase 1: Core DnD Infrastructure

### Objective

Set up the foundational drag-and-drop components and utilities without wiring to backend.

### Tasks

1. **Create touch detection utility**
   - `apps/webapp/src/utils/device.ts`
   - Export `isTouchDevice()` function

2. **Create DragHandle component**
   - `apps/webapp/src/components/atoms/DragHandle.tsx`
   - Grip icon from lucide-react
   - Hidden on touch devices via `isTouchDevice()`
   - Accept dnd-kit attributes and listeners

3. **Create DraggableWeeklyGoal wrapper**
   - `apps/webapp/src/components/molecules/goal/DraggableWeeklyGoal.tsx`
   - Use `useDraggable` from @dnd-kit/core
   - Pass drag data (goalId, sourceWeek, parentId)
   - Render drag handle + children

4. **Create DroppableWeekColumn wrapper**
   - `apps/webapp/src/components/molecules/multi-week/DroppableWeekColumn.tsx`
   - Use `useDroppable` from @dnd-kit/core
   - Pass drop data (week info)
   - Visual highlight when dragging over

5. **Update MultiWeekLayout**
   - Add drag state management (activeId, isDragging)
   - Add `onDragStart`, `onDragEnd`, `onDragCancel` handlers
   - Add `DragOverlay` for visual feedback

### Success Criteria

- [ ] Drag handles appear on desktop, hidden on mobile
- [ ] Weekly goals can be picked up (visual drag overlay appears)
- [ ] Week columns highlight when dragging over them
- [ ] Dropping anywhere cancels gracefully (no action yet)
- [ ] Console logs show drag events working correctly

### Files Changed

- `apps/webapp/src/utils/device.ts` (new)
- `apps/webapp/src/components/atoms/DragHandle.tsx` (new)
- `apps/webapp/src/components/molecules/goal/DraggableWeeklyGoal.tsx` (new)
- `apps/webapp/src/components/molecules/multi-week/DroppableWeekColumn.tsx` (new)
- `apps/webapp/src/components/molecules/multi-week/MultiWeekLayout.tsx` (modified)

---

## Phase 2: Week-to-Week Movement

### Objective

Wire the drag-and-drop to the existing `moveWeeklyGoalToWeek` backend mutation with optimistic updates.

### Tasks

1. **Identify weekly goal card component**
   - Find the component that renders individual weekly goal cards
   - Wrap with `DraggableWeeklyGoal`

2. **Wrap WeekCard with DroppableWeekColumn**
   - Modify `WeekCard.tsx` or `MultiWeekLayout.tsx`
   - Pass week context (year, quarter, weekNumber)

3. **Implement onDragEnd handler for week drops**
   - Extract source and target week from drag/drop data
   - Skip if same week (no-op)
   - Call `moveWeeklyGoalToWeek` mutation

4. **Add optimistic updates**
   - Use `useOptimistic` or local state to show immediate feedback
   - Handle rollback on error

5. **Add visual feedback**
   - Dim dragged goal in source location
   - Show insertion indicator in target week

### Success Criteria

- [ ] Dragging a weekly goal to another week moves it
- [ ] Daily goals under the weekly goal move automatically
- [ ] UI updates immediately (before server response)
- [ ] Dropping on same week does nothing
- [ ] Error state shows toast notification

### Files Changed

- `apps/webapp/src/components/molecules/multi-week/MultiWeekLayout.tsx` (modified)
- `apps/webapp/src/components/molecules/week/WeekCard.tsx` (modified)
- Weekly goal card component (to be identified - modified)

---

## Phase 3: Reparenting to Quarterly Goals

### Objective

Allow dropping weekly goals onto quarterly goal sections to change their parent.

### Tasks

1. **Create updateGoalParent backend mutation**
   - Add mutation to `services/backend/convex/goal.ts`
   - Validate ownership, depths, and same quarter
   - Update `parentId` and `inPath` fields

2. **Create DroppableQuarterlyGoal wrapper**
   - `apps/webapp/src/components/molecules/goal/DroppableQuarterlyGoal.tsx`
   - Use `useDroppable` with quarterly goal ID
   - Visual highlight when dragging over

3. **Wrap quarterly goal sections**
   - Modify `WeekCardQuarterlyGoals.tsx`
   - Each quarterly goal becomes a drop target

4. **Update onDragEnd handler**
   - Detect drop target type (week vs quarterly goal)
   - For quarterly goal drops, call `updateGoalParent`
   - Handle optimistic updates

5. **Add visual feedback for reparenting**
   - Highlight quarterly goal section on drag over
   - Show insertion indicator

### Success Criteria

- [ ] Dragging a weekly goal onto a quarterly goal changes its parent
- [ ] Goal remains in same week after reparent
- [ ] UI updates immediately
- [ ] Cannot reparent to self or to daily goals
- [ ] Error handling with toast notifications

### Files Changed

- `services/backend/convex/goal.ts` (modified - new mutation)
- `apps/webapp/src/components/molecules/goal/DroppableQuarterlyGoal.tsx` (new)
- `apps/webapp/src/components/organisms/WeekCardQuarterlyGoals.tsx` (modified)
- `apps/webapp/src/components/molecules/multi-week/MultiWeekLayout.tsx` (modified)

---

## Phase 4: Polish & Edge Cases

### Objective

Handle edge cases, improve visual feedback, and ensure robustness.

### Tasks

1. **Keyboard escape to cancel**
   - Add keyboard listener in DndContext
   - Cancel drag on Escape key

2. **Invalid drop feedback**
   - Visual indication when dropping in invalid zone
   - Toast message for user feedback

3. **Loading states**
   - Show spinner or skeleton during server update
   - Disable drag during pending mutations

4. **Error recovery**
   - Rollback optimistic update on error
   - Show clear error message

5. **Testing**
   - Manual test all scenarios
   - Verify no regressions in existing functionality

6. **Documentation**
   - Update component documentation
   - Add inline code comments for complex logic

### Success Criteria

- [ ] Escape key cancels drag operation
- [ ] Invalid drops show feedback
- [ ] Loading states are visible
- [ ] Errors are handled gracefully
- [ ] No regressions in existing features
- [ ] Code is documented

### Files Changed

- Various files from previous phases (polish)
- Test files if applicable

---

## Dependencies

```
Phase 1 (Infrastructure)
    ↓
Phase 2 (Week-to-Week) ─────┐
                             ├──→ Phase 4 (Polish)
Phase 3 (Reparenting) ──────┘
```

- Phase 1 must complete before Phase 2 or 3
- Phase 2 and 3 can be done in parallel
- Phase 4 depends on both Phase 2 and Phase 3

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Goal card component hard to identify | Explore codebase first, may need refactoring |
| Optimistic updates complex | Start simple, enhance if needed |
| Collision detection issues | Test with various layouts, tune sensitivity |
| Performance with many goals | Use memo/useMemo, virtualization if needed |
