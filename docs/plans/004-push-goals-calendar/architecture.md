# Architecture: Push Goals Back via Calendar

## Overview

This feature enhances the existing goal moving UI by adding a calendar picker component. The backend logic already exists; this is primarily a frontend enhancement.

## Research Findings

### Existing Infrastructure

**Backend Mutations (already exist):**
- `moveGoalsFromWeek` - Move goals between weeks
- `moveGoalsFromDay` - Move goals between days
- `moveWeeklyGoalToWeek` - Move weekly goal to specific week

**Frontend Hooks (already exist):**
- `useMoveWeeklyGoal` - Hook for moving weekly goals
- `usePullGoals` - Hook for pulling goals forward
- `useMoveGoalsForQuarter` - Quarter-level moves

**UI Components (already exist):**
- `MoveGoalToWeekModal` - Modal with dropdown select (can be enhanced)
- `Calendar` - react-day-picker based calendar component

### Existing Move Flow

1. User opens goal action menu
2. Clicks "Move to Week..."
3. `MoveGoalToWeekModal` opens with dropdown select
4. User selects destination week from dropdown
5. Mutation called, goal moved

### Proposed Enhancement

Replace/enhance the dropdown in `MoveGoalToWeekModal` with a calendar picker:

```
[Current: Dropdown Select] → [New: Calendar Picker + Quick Actions]
```

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Approach | Enhance existing modal | Reuse existing hooks and logic |
| Calendar lib | react-day-picker (existing) | Already in project, styled |
| Week selection | Calendar with week highlight | Visual week boundaries |
| Quick actions | Buttons above calendar | Fast access to common dates |
| Constraints | Disable dates outside quarter | Preserve business rules |

## Component Changes

### Modified: `MoveGoalToWeekModal.tsx`

Replace dropdown with calendar:

```tsx
// Before
<Select onValueChange={setSelectedWeek}>
  {destinationWeeks.map(week => ...)}
</Select>

// After
<div className="space-y-4">
  {/* Quick actions */}
  <div className="flex gap-2">
    <Button variant="outline" onClick={() => setDate(nextWeek)}>
      Next Week
    </Button>
    <Button variant="outline" onClick={() => setDate(twoWeeksLater)}>
      In 2 Weeks
    </Button>
  </div>
  
  {/* Calendar */}
  <Calendar
    mode="single"
    selected={selectedDate}
    onSelect={handleDateSelect}
    disabled={(date) => !isWithinQuarter(date)}
  />
</div>
```

### New Utility: Week/Date conversion helpers

```typescript
// Convert calendar date to week number
function getWeekFromDate(date: Date): WeekInfo;

// Convert week number to date range
function getDateRangeForWeek(year: number, weekNumber: number): DateRange;

// Check if date is within quarter
function isDateWithinQuarter(date: Date, year: number, quarter: number): boolean;
```

## Data Flow

```
User clicks "Move to Week..."
        ↓
MoveGoalToWeekModal opens with Calendar
        ↓
User selects date from calendar
        ↓
Date → converted to week number
        ↓
moveWeeklyGoalToWeek mutation called
        ↓
Goal moved, modal closes
```

## Considerations

### Week Selection Mode

For weekly goals, the calendar should select whole weeks:
- Highlight entire week when hovering
- Clicking any day in a week selects that week
- Show week number in the calendar

### Daily Goal Mode

For daily goals, select individual days:
- Standard single-day selection
- Can extend to cross-week if within quarter
