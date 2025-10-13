# Phase 2 Refactoring Plan: Context Implementation

## Goal
Eliminate prop drilling by using GoalActionsContext to provide onUpdateGoal and onDeleteGoal handlers.

## Components Analysis

### Provider Insertion Points (create handlers from useWeek)
Components that call useWeek() and create handlers - these will wrap with GoalActionsProvider:
1. FocusModeDailyView - ✓ Already wraps with WeekProviderWithoutDashboard
2. FocusModeWeeklyView - Uses useWeek
3. FocusModeQuarterlyView - Uses useWeek
4. WeekCardDailyGoals - Uses useWeek
5. WeekCardWeeklyGoals - Uses useWeek
6. WeekCardQuarterlyGoals - Uses useWeek
7. GoalDetailsChildrenList - Uses useWeek

### Leaf Components (will use context instead of props)
Components that receive handlers as props and use them directly:
1. DailyGoalTaskItem - receives onUpdateGoal, onDelete
2. QuarterlyGoal - receives onUpdateGoal
3. WeeklyGoalTaskItem - receives onUpdateGoal
4. QuarterlyGoalHeader - receives onUpdateGoal
5. GoalDetailsPopover - receives onSave (wrapper around onUpdateGoal)
6. GoalDetailsFullScreenModal - receives onSave (wrapper around onUpdateGoal)

### Intermediate Components (props will be removed)
Components that just pass handlers through:
1. DayContainer
2. WeeklyGoalSection
3. QuarterlyGoalSection
4. DailyGoalList
5. DailyGoalListContainer
6. DailyGoalGroup
7. DailyGoalGroupContainer
8. OnFireGoalsSection
9. PendingGoalsSection
10. FocusModeDailyViewDailyGoals

## Implementation Strategy

### Step 1: Add Providers (✓ = done)
- [✓] FocusModeDailyViewInner (COMPLETED - provides context to all children)

Note: Only one provider was needed at the top level since all components are descendants.

### Step 2: Migrate Leaf Components
- [✓] DailyGoalTaskItem (removed props, uses context)
- [N/A] QuarterlyGoal (not a leaf in focus view)
- [N/A] WeeklyGoalTaskItem (receives props from OnFire/Pending sections)
- [N/A] QuarterlyGoalHeader (not used in focus view)
- [N/A] GoalDetailsPopover (receives onSave wrapper, not direct handlers)
- [N/A] GoalDetailsFullScreenModal (receives onSave wrapper, not direct handlers)

### Step 3: Remove Props from Intermediates
- [✓] DayContainer (kept with biome-ignore for compatibility)
- [✓] DailyGoalList (removed all handler props)
- [✓] DailyGoalListContainer (removed all handler props)
- [✓] DailyGoalGroup (uses context instead of props)
- [N/A] DailyGoalGroupContainer (not in codebase)
- [✓] OnFireGoalsSection (removed props, uses context internally)
- [✓] PendingGoalsSection (removed props, uses context internally)
- [N/A] FocusModeDailyViewDailyGoals (doesn't pass handlers)

### Step 4: Verification
- [✓] Typecheck passes
- [✓] Lint passes
- [✓] Tests pass
- [✓] Commit

## Notes
- GoalDetailsPopover/Modal receive onSave which is a wrapper - they'll still need a prop but won't need to pass handlers down
- Some components may need both approaches during transition

