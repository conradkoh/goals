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

- Started: 2025-12-02
- Phase 1 Complete: ✅ Fixed adhoc ordering
- Phase 2 Complete: ✅ Fixed OnFire/Pending sections
- Phase 3 Complete: ✅ Verified goal-details-popover integration
- All Done: ✅ 2025-12-02

---

## Phase 2: Fix Provider Architecture Issues

### Issue 1: FocusModeWeeklyView - Multiple Providers
- **Status**: ✅ Complete
- **Problem**: 4 separate `WeekProviderWithoutDashboard` instances
- **Fix**: Moved single provider to outer component, inner uses context

### Issue 2: MultiWeekLayout/WeekCard - Double Nested Providers
- **Status**: ✅ Complete
- **Problem**: WeekCard and WeekCardContent both wrap in providers
- **Fix**: Removed nested provider in WeekCardContent, WeekCard provides single context

---

## Summary of Changes

### Files Modified:
1. `apps/webapp/src/components/organisms/focus/AdhocGoalsSection.tsx`
   - Changed optimistic goal insertion from prepend to append
   - Fixed array combination order to put optimistic goals at end

2. `apps/webapp/src/components/molecules/DomainPopover.tsx`
   - Same fix as AdhocGoalsSection for consistency

3. `apps/webapp/src/components/organisms/focus/FocusModeDailyView.tsx`
   - Changed `preparedWeeklyGoalsForDay` to use `quarterlyGoals` from `useWeek()` context
   - This ensures OnFireGoalsSection and PendingGoalsSection see optimistic updates

### Root Causes Fixed:
1. **Ordering**: Arrays were using `[newItem, ...prev]` (prepend) instead of `[...prev, newItem]` (append)
2. **Missing Updates**: Components were reading from static props instead of context with optimistic state
