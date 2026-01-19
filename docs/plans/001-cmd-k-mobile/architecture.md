# Architecture: CMD + K Command Palette on Mobile

## Changes Overview

This feature adds a mobile-friendly trigger button to open the existing command palette. The change is primarily in the presentation layer with minimal architectural impact.

## Current Architecture

```
DashboardFocusView
├── ViewModeKeyboardShortcuts (listens for CMD+K)
├── GoalSearchDialog (command palette for weekly/daily)
├── QuarterJumpDialog (command palette for quarterly)
├── FocusMenuBar (navigation UI)
└── View-specific components (FocusModeDailyView, etc.)
```

The keyboard shortcut flow:
1. `ViewModeKeyboardShortcuts` registers global keydown listener
2. On CMD+K, calls `onOpenQuarterJump` callback
3. `DashboardFocusView` sets appropriate dialog state to open
4. Dialog renders with search functionality

## Design Decisions (Finalized in Discussion)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Placement | Menu Bar Integration (trailing position) | Cleaner, consistent, no overlap |
| Position | Right side (trailing) | Better thumb ergonomics on mobile |
| Visibility | Always visible on all devices | Aids discovery, accessibility |
| Icon | Search (🔍) | Universally understood |
| Tooltip | Platform-aware | Mac: "⌘K", Windows: "Ctrl+K", Mobile: none |
| Touch Target | h-9 w-9 (36px) | Meets accessibility guidelines |
| Active State | None | Dialog overlay provides feedback |
| Component | Inline in FocusMenuBar (YAGNI) | Extract later if reused |

## Modified Components

### FocusMenuBar

**File:** `apps/webapp/src/components/molecules/focus/FocusMenuBar.tsx`

**Changes:**
1. Add `onOpenCommandPalette?: () => void` prop
2. Add Search button in trailing position with Tooltip
3. Use h-9 w-9 size for accessibility

```tsx
// New prop
onOpenCommandPalette?: () => void;

// Button implementation (trailing, after action menus)
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenCommandPalette}
        className="h-9 w-9 text-muted-foreground hover:text-foreground"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>{getSearchShortcutLabel()}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### DashboardFocusView

**File:** `apps/webapp/src/components/organisms/DashboardFocusView.tsx`

**Changes:**
- Pass `onOpenCommandPalette` prop to FocusMenuBar
- Wire to existing handler that opens GoalSearchDialog/QuarterJumpDialog

## New Utility Functions

### getSearchShortcutLabel

Platform-aware tooltip text helper:

```typescript
function getSearchShortcutLabel(): string {
  if (typeof navigator !== 'undefined') {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) return 'Search';
    return isMac ? 'Search (⌘K)' : 'Search (Ctrl+K)';
  }
  return 'Search';
}
```

## Modified Contracts

### FocusMenuBarProps (Extended)

```typescript
export type FocusMenuBarProps = {
  // ... existing props ...
  
  /** Handler to open the command palette / search dialog */
  onOpenCommandPalette?: () => void;
};
```

## Data Flow

```
User taps search button
        ↓
FocusMenuBar button onClick
        ↓
onOpenCommandPalette callback
        ↓
DashboardFocusView sets dialog state
        ↓
GoalSearchDialog or QuarterJumpDialog renders
```

This is identical to the existing keyboard shortcut flow, just with a different entry point.
