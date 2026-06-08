# PRD: Push Goals Back via Calendar

## Glossary

| Term | Definition |
|------|------------|
| **Push Goal** | Moving a goal to a later date (postponing) |
| **Weekly Goal** | A goal assigned to a specific week within a quarter |
| **Daily Goal** | A goal assigned to a specific day within a week |
| **Calendar Picker** | A visual calendar interface for selecting dates |
| **MoveGoalToWeekModal** | Existing modal for moving weekly goals (uses dropdown) |

## User Stories

### US-001: Reschedule Weekly Goal via Calendar
**As a** user,
**I want** to select a target week from a calendar when moving a weekly goal,
**so that** I can visually see and choose the destination week.

**Acceptance Criteria:**
- Calendar picker shows weeks within the current quarter
- Current week is highlighted
- Weeks outside quarter are disabled
- Selecting a week moves the goal to that week
- Existing move logic (move_all/copy_children) is preserved

### US-002: Reschedule Daily Goal via Calendar
**As a** user,
**I want** to select a target day from a calendar when moving a daily goal,
**so that** I can easily pick the specific date.

**Acceptance Criteria:**
- Calendar shows days within the current week
- Days outside current week can show next week options
- Selecting a day moves the goal to that day
- Past days are shown but selectable (for flexibility)

### US-003: Access Calendar from Goal Action Menu
**As a** user,
**I want** to access the calendar picker from the goal's action menu,
**so that** the rescheduling flow is easy to discover.

**Acceptance Criteria:**
- "Move to..." or "Reschedule" option in goal context menu
- Opens calendar picker modal
- Current goal's date is pre-selected

### US-004: Quick Reschedule Shortcuts
**As a** user,
**I want** quick shortcuts like "Tomorrow", "Next Week",
**so that** common rescheduling actions are fast.

**Acceptance Criteria:**
- Quick action buttons for common dates
- "Tomorrow" for daily goals
- "Next Week" for weekly goals
- Buttons visible alongside calendar
