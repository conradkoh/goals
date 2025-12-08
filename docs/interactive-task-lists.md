# Interactive Task Lists Implementation

## Overview

This document describes the implementation of interactive task lists using Tiptap's TaskList and TaskItem extensions. Users can now create checkable task lists in goal details that persist their state when checked/unchecked.

## Features

### Editor Features (RichTextEditor)

1. **Task List Creation**
   - Type `[ ] ` or `[x] ` at the start of a line to create a task list
   - Checkboxes are automatically rendered
   - Supports nested task lists
   - Keyboard shortcut: `[ ] ` + space

2. **Visual Styling**
   - Unchecked items: Normal text
   - Checked items: Strikethrough with reduced opacity
   - Clean, modern checkbox design
   - Proper spacing and alignment

### Viewer Features (InteractiveHTML)

1. **Interactive Checkboxes**
   - Click checkboxes to toggle completion state
   - Changes are automatically saved to the goal
   - Real-time updates without page refresh
   - Maintains all other HTML content

2. **Read-Only Mode**
   - Optionally disable checkbox interactions
   - Useful for archived or historical views

## Implementation Details

### Package Updates

All Tiptap packages were updated to the latest version (v3.13.0):
- `@tiptap/core`
- `@tiptap/extension-link`
- `@tiptap/extension-placeholder`
- `@tiptap/extension-underline`
- `@tiptap/pm`
- `@tiptap/react`
- `@tiptap/starter-kit`

New packages added:
- `@tiptap/extension-task-list`
- `@tiptap/extension-task-item`

### Key Components Modified

#### 1. RichTextEditor (`components/ui/rich-text-editor.tsx`)
- Added TaskList and TaskItem extensions
- Configured HTML attributes for proper styling
- Added markdown shortcut for task list creation (`[ ] ` or `[x] `)

#### 2. InteractiveHTML (`components/ui/interactive-html.tsx`) - NEW
- New component for rendering HTML with interactive features
- **Key insight**: Tiptap's `getHTML()` doesn't include actual checkbox elements - only `data-checked` attributes
- Dynamically injects checkbox elements into task list items
- Handles checkbox click events and updates `data-checked` attributes
- Extracts clean HTML (without injected checkboxes) for persistence
- Calls `onContentChange` callback with clean HTML
- Supports read-only mode

#### 3. SafeHTML (`components/ui/safe-html.tsx`)
- Updated DOMPurify config to allow task list elements:
  - `<label>` and `<input>` tags
  - `data-type`, `data-checked`, `type`, `checked` attributes

#### 4. GoalDetailsContent (`components/molecules/goal-details-popover/view/components/GoalDetailsContent.tsx`)
- Added `onDetailsChange` callback prop
- Added `readOnly` prop
- Conditionally uses InteractiveHTML when interactive features are enabled
- Falls back to SafeHTML for read-only views

#### 5. GoalDetailsSection (`components/molecules/goal-details-popover/view/components/GoalDetailsSection.tsx`)
- Added `onDetailsChange` and `readOnly` props
- Passes props through to GoalDetailsContent

#### 6. All Goal Popovers
Updated all popover variants to support interactive task lists:
- `AdhocGoalPopover`
- `DailyGoalPopover`
- `WeeklyGoalPopover`
- `QuarterlyGoalPopover`

Each popover now:
- Creates a `handleDetailsChange` function
- Passes it to GoalDetailsSection
- Automatically saves changes when checkboxes are toggled

### CSS Styling

Added comprehensive task list styling in `rich-text-editor.module.css`:

```css
/* Task lists - special styling for checkable items */
.prose :global(ul[data-type="taskList"]) {
  list-style: none !important;
  padding-left: 0 !important;
}

.prose :global(li[data-type="taskItem"]) {
  display: flex !important;
  align-items: flex-start !important;
  gap: 0.5rem !important;
}

/* Checkbox styling */
.prose :global(li[data-type="taskItem"] > label > input[type="checkbox"]) {
  width: 1rem !important;
  height: 1rem !important;
  cursor: pointer !important;
  border-radius: 0.25rem !important;
}

/* Checked state - strikethrough */
.prose :global(li[data-type="taskItem"][data-checked="true"] > div) {
  text-decoration: line-through !important;
  opacity: 0.6 !important;
}
```

## Usage

### Creating Task Lists in the Editor

1. Open a goal's edit mode
2. In the details field, type:
   ```
   [ ] First task
   [ ] Second task
   [x] Completed task
   ```
3. Press space after `[ ] ` to convert to checkboxes
4. Save the goal

### Checking Items in View Mode

1. View any goal with task lists in its details
2. Click checkboxes to toggle completion
3. Changes are automatically saved
4. Checked items show strikethrough styling

## Architecture

```
User clicks checkbox
       ↓
InteractiveHTML detects change
       ↓
Updates data-checked attribute
       ↓
Calls onContentChange(newHtml)
       ↓
handleDetailsChange in popover
       ↓
Calls onSave(title, newDetails, dueDate, domainId)
       ↓
Goal is updated in database
       ↓
UI reflects new state
```

## Benefits

1. **Better Task Management**: Break down goals into checkable sub-tasks
2. **Visual Progress**: See at a glance what's done and what's pending
3. **Seamless UX**: No need to enter edit mode to check off items
4. **Persistent State**: All checkbox states are saved to the database
5. **Familiar Pattern**: Uses standard markdown syntax (`[ ]` and `[x]`)

## Future Enhancements

Potential improvements:
- Progress indicators showing % of tasks completed
- Bulk operations (check all, uncheck all)
- Task reordering via drag & drop
- Task metadata (due dates, assignees)
- Task filtering and sorting

## Testing

To test the implementation:

1. Create a new goal or edit an existing one
2. Add task list content:
   ```
   Project Setup:
   [ ] Install dependencies
   [ ] Configure environment
   [ ] Set up database
   ```
3. Save and view the goal
4. Click checkboxes to verify they work
5. Refresh the page to verify persistence
6. Try nested task lists and markdown formatting

## Notes

- Task list HTML is sanitized through DOMPurify for security
- Changes are debounced to avoid excessive saves
- Works in both popover and full-screen dialog views
- Compatible with dark mode
- Fully keyboard accessible

