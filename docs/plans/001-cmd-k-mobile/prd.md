# PRD: CMD + K Command Palette on Mobile

## Glossary

| Term | Definition |
|------|------------|
| **Command Palette** | A dialog that allows users to search for goals, domains, and perform quick actions. Triggered by CMD/CTRL + K on desktop. |
| **Goal Search Dialog** | The implementation of the command palette used in weekly/daily views (`GoalSearchDialog.tsx`) |
| **Quarter Jump Dialog** | The command palette variant used in quarterly view (`QuarterJumpDialog.tsx`) |
| **Mobile Trigger** | A visible button that opens the command palette on touch devices |
| **Touch Device** | Devices without physical keyboards - phones, tablets in touch mode |

## User Stories

### US-001: Access Command Palette on Mobile
**As a** mobile user,
**I want** to be able to open the command palette by tapping a visible button,
**so that** I can quickly search for and navigate to my goals without needing a keyboard.

**Acceptance Criteria:**
- A visible trigger button is displayed on mobile devices
- Tapping the button opens the appropriate command palette (GoalSearchDialog or QuarterJumpDialog based on current view)
- The button is positioned in an easily reachable location
- The button has clear visual affordance (icon suggests search/command functionality)

### US-002: Non-Intrusive Desktop Experience
**As a** desktop user,
**I want** the mobile trigger to be hidden or unobtrusive on large screens,
**so that** my existing workflow using CMD+K is not disrupted by unnecessary UI elements.

**Acceptance Criteria:**
- The mobile trigger is hidden on devices with likely keyboard access (desktop screens)
- Alternatively, if shown, it doesn't interfere with the primary interface
- Keyboard shortcut continues to work exactly as before

### US-003: Consistent Experience Across Views
**As a** user,
**I want** the mobile trigger to work the same way across daily, weekly, and quarterly views,
**so that** I have a predictable experience regardless of which view I'm using.

**Acceptance Criteria:**
- Mobile trigger is present in all three view modes
- In quarterly view: opens Quarter Jump Dialog
- In weekly/daily view: opens Goal Search Dialog
- Trigger position is consistent across views

### US-004: Accessible Trigger Button
**As a** user with accessibility needs,
**I want** the mobile trigger button to be properly labeled and accessible,
**so that** I can use it with screen readers and other assistive technologies.

**Acceptance Criteria:**
- Button has proper aria-label describing its function
- Button is focusable and keyboard-navigable
- Button meets minimum touch target size (44x44 points)
