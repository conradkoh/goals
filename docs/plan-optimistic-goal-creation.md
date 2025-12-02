# Plan: Fix Optimistic Goal Creation

## Overview
Consolidate optimistic goal creation to use a single source of truth and fix ordering issues.

## Issues to Fix

### Issue 1: AdhocGoalsSection - New items appear at top instead of bottom
- **Status**: ✅ Complete
- **Complexity**: Quick fix
- **Files**: `AdhocGoalsSection.tsx`, `DomainPopover.tsx`
- **Problem**: Optimistic goals prepended instead of appended
- **Solution**: Change array operations to append instead of prepend

### Issue 2: OnFireGoalsSection & PendingGoalsSection - No optimistic updates
- **Status**: ✅ Complete  
- **Complexity**: Medium
- **Files**: `FocusModeDailyView.tsx`, `OnFireGoalsSection.tsx`, `PendingGoalsSection.tsx`
- **Problem**: Components read from static `weekData.tree` props instead of optimistic context
- **Solution**: Use `useWeek()` context data which includes optimistic updates

### Issue 3: Consolidate to goal-details-popover conventions
- **Status**: ✅ Complete (verified existing integration works correctly)
- **Complexity**: Medium
- **Problem**: Multiple implementations of optimistic state management
- **Solution**: Ensure all goal displays use the WeekProvider's optimistic data

---

## Implementation Plan

### Phase 1: Quick Fix - Adhoc Ordering ✅
- [x] Fix `AdhocGoalsSection.tsx` - change prepend to append
- [x] Fix `DomainPopover.tsx` - change prepend to append
- [x] Test ordering is correct

### Phase 2: Fix OnFire/Pending Sections
- [x] Update `FocusModeDailyViewInner` to compute `weeklyGoalsWithQuarterly` from `useWeek()` context
- [x] Verify optimistic goals appear in OnFire section
- [x] Verify optimistic goals appear in Pending section

### Phase 3: Verify goal-details-popover Integration
- [x] Confirm `WeeklyGoalPopover` creates optimistic daily goals correctly
- [x] Confirm `QuarterlyGoalPopover` creates optimistic weekly goals correctly
- [x] Confirm `DailyGoalPopover` displays correctly with optimistic data

### Phase 4: Final Verification
- [x] Run TypeScript check
- [x] Commit changes

---

## Architecture After Fix

```
WeekProviderWithoutDashboard (single source of truth)
    ├── quarterlyGoals (with optimistic)
    ├── weeklyGoals (with optimistic, children updated)
    └── dailyGoals (with optimistic)
            │
            ▼
    All components use useWeek() to get data
            │
            ├── FocusModeDailyView
            │       ├── OnFireGoalsSection (reads from context)
            │       ├── PendingGoalsSection (reads from context)
            │       └── AdhocGoalsSection (uses hook's optimistic state)
            │
            └── goal-details-popover variants
                    ├── QuarterlyGoalPopover → creates weekly via context
                    ├── WeeklyGoalPopover → creates daily via context
                    └── DailyGoalPopover → displays from context
```

---

## Progress Log

- Started: [timestamp]
- Phase 1 Complete: [timestamp]
- Phase 2 Complete: [timestamp]
- Phase 3 Complete: [timestamp]
- All Done: [timestamp]
