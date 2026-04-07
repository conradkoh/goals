# Implementation Phases: Push Goals Back via Calendar

## Phase Overview

| Phase | Description | Scope |
|-------|-------------|-------|
| Phase 1 | Date utility helpers | Backend/Frontend |
| Phase 2 | Enhance MoveGoalToWeekModal with calendar | Frontend |
| Phase 3 | Daily goal calendar support | Frontend |
| Phase 4 | Quick action buttons | Frontend |

## Phase 1: Date Utility Helpers

### Objective
Create utility functions for converting between calendar dates and week numbers.

### Tasks

1. **Add date-to-week conversion**
   - Get ISO week number from Date
   - Check if date is within a specific quarter

2. **Add week-to-date conversion**
   - Get start and end date for a week number
   - Get all dates in a week

### Success Criteria
- [ ] Can convert Date → week number
- [ ] Can check if date is within quarter
- [ ] Existing tests pass

### Files Changed
- `apps/webapp/src/lib/date/iso-week.ts` (enhanced)

## Phase 2: Enhance MoveGoalToWeekModal

### Objective
Replace dropdown select with calendar picker in the move goal modal.

### Tasks

1. **Update MoveGoalToWeekModal**
   - Import Calendar component
   - Replace Select with Calendar
   - Add week highlighting mode
   - Convert selected date to week number

2. **Style calendar for week selection**
   - Highlight entire week on hover
   - Show week numbers
   - Disable dates outside quarter

3. **Preserve existing move logic**
   - Keep move_all/copy_children modes
   - Keep confirmation dialog
   - Keep loading states

### Success Criteria
- [ ] Calendar shows in modal instead of dropdown
- [ ] Selecting date moves goal correctly
- [ ] Weeks outside quarter are disabled
- [ ] Move modes still work

### Files Changed
- `apps/webapp/src/components/molecules/goal-details-popover/view/components/MoveGoalToWeekModal.tsx` (modified)

## Phase 3: Daily Goal Calendar Support

### Objective
Support calendar-based rescheduling for daily goals.

### Tasks

1. **Create or enhance daily goal move modal**
   - Calendar in single-day mode
   - Convert date to day of week + week
   - Call moveGoalsFromDay mutation

2. **Add to daily goal action menu**
   - "Move to Day..." option
   - Opens calendar modal

### Success Criteria
- [ ] Daily goals can be moved via calendar
- [ ] Accessible from action menu
- [ ] Cross-week moves handled correctly

### Files Changed
- New modal or enhanced existing
- Daily goal action menu

## Phase 4: Quick Action Buttons

### Objective
Add quick shortcuts for common rescheduling actions.

### Tasks

1. **Add quick action buttons**
   - "Next Week" button (weekly goals)
   - "Tomorrow" button (daily goals)
   - "In 2 Weeks" button

2. **Position above calendar**
   - Visible and accessible
   - Click auto-selects and moves

### Success Criteria
- [ ] Quick buttons visible in modal
- [ ] Clicking button moves goal immediately
- [ ] Feedback on success

### Files Changed
- `MoveGoalToWeekModal.tsx` (modified)

## Dependencies

- Phase 2 depends on Phase 1
- Phase 3 can run parallel to Phase 2
- Phase 4 depends on Phase 2

## Notes

- Reuse existing Calendar component
- Preserve all existing move logic
- Focus on weekly goals first (most common use case)
