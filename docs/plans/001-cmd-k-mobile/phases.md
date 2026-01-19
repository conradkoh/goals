# Implementation Phases: CMD + K Command Palette on Mobile

## Phase Overview

This is a simple feature consolidated into a single phase after design discussion:

| Phase | Description | Scope |
|-------|-------------|-------|
| Phase 1 | Add search button with accessibility | Full implementation |

## Design Decisions (From Discussion Rounds 1-3)

| Decision | Choice |
|----------|--------|
| Placement | Menu Bar (trailing position, right side) |
| Visibility | Always visible on all devices |
| Icon | Search (🔍) from lucide-react |
| Touch Target | h-9 w-9 (36px) |
| Tooltip | Platform-aware (⌘K on Mac, Ctrl+K on Windows, none on mobile) |
| Component | Inline in FocusMenuBar (YAGNI - no separate component) |
| Active State | None (dialog overlay provides feedback) |

## Phase 1: Add Search Button to Menu Bar

### Objective
Add a visible search button to FocusMenuBar that opens the command palette, with proper accessibility.

### Tasks

1. **Add prop to FocusMenuBar**
   - Add `onOpenCommandPalette?: () => void` to `FocusMenuBarProps`

2. **Add Search button with Tooltip**
   - Import `Search` from lucide-react
   - Import `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from `@/components/ui/tooltip`
   - Add button in trailing position (after action menus)
   - Use h-9 w-9 size for accessibility
   - Add platform-aware tooltip helper function

3. **Wire from DashboardFocusView**
   - Pass `onOpenCommandPalette` prop to FocusMenuBar
   - Use existing `handleOpenGoalSearch` or create unified handler

### Implementation Code

```tsx
// In FocusMenuBar.tsx - Add import
import { Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Helper function (can be inline or in utils)
function getSearchShortcutLabel(): string {
  if (typeof navigator !== 'undefined') {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) return 'Search';
    return isMac ? 'Search (⌘K)' : 'Search (Ctrl+K)';
  }
  return 'Search';
}

// In FocusMenuBar component, after action menus:
{onOpenCommandPalette && (
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
)}
```

### Success Criteria
- [ ] Button is visible in the menu bar (trailing position)
- [ ] Tapping button opens command palette in all views (daily, weekly, quarterly)
- [ ] Keyboard shortcut (CMD/CTRL + K) still works
- [ ] Button has proper 36px touch target
- [ ] Tooltip shows platform-appropriate shortcut hint
- [ ] Works in both light and dark mode
- [ ] Works on mobile and desktop browsers

### Files Changed
- `apps/webapp/src/components/molecules/focus/FocusMenuBar.tsx` (modified)
- `apps/webapp/src/components/organisms/DashboardFocusView.tsx` (modified)

## Dependencies

- No backend changes required
- No data migration required
- No new dependencies required
