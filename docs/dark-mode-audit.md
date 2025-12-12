# Dark Mode Audit & Theming Codemap

> **Purpose**: Consolidated view of theming architecture and dark mode compliance issues for designer review and subsequent developer fixes.

---

## Table of Contents

1. [Theming Architecture Overview](#theming-architecture-overview)
2. [Semantic Color System](#semantic-color-system)
3. [Dark Mode Violations by Severity](#dark-mode-violations-by-severity)
4. [Component-by-Component Findings](#component-by-component-findings)
5. [Recommendations](#recommendations)

---

## Theming Architecture Overview

### Core Files

| File                                              | Purpose                                                 |
| ------------------------------------------------- | ------------------------------------------------------- |
| `apps/webapp/tailwind.config.ts`                  | Tailwind configuration with semantic color tokens       |
| `apps/webapp/src/app/globals.css`                 | CSS variables for light/dark themes (OKLCH color space) |
| `apps/webapp/src/modules/theme/ThemeProvider.tsx` | React context provider for theme state                  |
| `apps/webapp/src/modules/theme/ThemeSettings.tsx` | UI for theme selection (light/dark/system)              |
| `apps/webapp/src/modules/theme/theme-utils.ts`    | Type definitions for themes                             |

### Theme Switching Mechanism

- **Strategy**: Class-based (`darkMode: 'class'` in Tailwind config)
- **Storage**: `localStorage.getItem('theme')` with values `'light' | 'dark' | 'system'`
- **Flash Prevention**: Inline script in `ThemeProvider.tsx` applies theme before React hydration
- **System Detection**: Uses `prefers-color-scheme` media query for system theme

### Color Variable System

The app uses OKLCH color space for all theme colors, defined in `globals.css`:

```css
/* Light mode (default) */
:root {
  --background: oklch(1 0 0); /* Pure white */
  --foreground: oklch(0.145 0 0); /* Near black */
  --card: oklch(1 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  /* ... etc */
}

/* Dark mode */
.dark {
  --background: oklch(0.145 0 0); /* Near black */
  --foreground: oklch(0.985 0 0); /* Near white */
  --card: oklch(0.205 0 0);
  /* ... etc */
}
```

---

## Semantic Color System

### ✅ Correct Usage (Auto-adapts to Dark Mode)

| Purpose           | Class                   | Notes                         |
| ----------------- | ----------------------- | ----------------------------- |
| Primary text      | `text-foreground`       | Automatically inverts         |
| Secondary text    | `text-muted-foreground` | Gray that adapts              |
| Page background   | `bg-background`         | White ↔ Dark gray             |
| Card background   | `bg-card`               | Slight elevation difference   |
| Interactive hover | `hover:bg-accent`       | Adapts appropriately          |
| Borders           | `border-border`         | Uses theme-aware border color |
| Form inputs       | `border-input`          | Specific to form elements     |

### ❌ Problematic Patterns (Do NOT Use Alone)

| Pattern           | Issue                   | Fix Pattern                                       |
| ----------------- | ----------------------- | ------------------------------------------------- |
| `bg-white`        | White in dark mode      | Use `bg-card` or `bg-white dark:bg-gray-900`      |
| `text-black`      | Black on dark bg        | Use `text-foreground`                             |
| `text-gray-900`   | Too dark in dark mode   | Use `text-foreground` or add `dark:text-gray-100` |
| `bg-gray-50`      | Light gray in dark mode | Add `dark:bg-gray-900` or use `bg-muted`          |
| `text-gray-500`   | Low contrast in dark    | Add `dark:text-gray-400`                          |
| `border-gray-200` | Invisible in dark       | Use `border-border` or add `dark:border-gray-700` |

---

## Dark Mode Violations by Severity

### 🔴 Critical (Entire Section Non-Functional in Dark Mode)

#### Documentation Section (`/docs/*`)

The entire docs section is built without dark mode consideration:

**⚠️ STILL PENDING**: Refactor all docs components to use semantic tokens (`bg-background`, `text-foreground`) instead of `slate-*`. (Note: The docs section was not part of this fix pass - to be addressed separately)

| File                                                    | Issues                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/app/docs/layout.tsx`                               | `bg-slate-50`, `bg-white`, `text-slate-700`, `hover:bg-slate-100`, `bg-slate-100`  |
| `src/app/docs/terminology/page.tsx`                     | `bg-white`, `bg-slate-100`, `text-slate-900`, `text-slate-600`, `border-slate-200` |
| `src/app/docs/installation/page.tsx`                    | `bg-white`, `bg-slate-100`, `text-slate-900`, `text-slate-600`, `text-slate-700`   |
| `src/app/docs/keyboard-shortcuts/page.tsx`              | `bg-white`, `bg-slate-100`, `text-slate-900`, `text-slate-600`                     |
| `src/app/docs/page.tsx`                                 | `text-slate-600`, `text-slate-900`, `bg-slate-50`, `border-slate-200`              |
| `src/app/docs/components/primitives/DocCard.tsx`        | `text-slate-600`                                                                   |
| `src/app/docs/components/primitives/DocFeatureCard.tsx` | `bg-slate-200`, `text-slate-700`, `text-slate-900`, `text-slate-600`               |
| `src/app/docs/components/primitives/DocHeader.tsx`      | `bg-slate-100`, `text-slate-700`, `text-slate-900`, `text-slate-600`               |
| `src/app/docs/components/primitives/DocInfoCard.tsx`    | `bg-slate-50`, `border-slate-200`, `text-slate-700`                                |
| `src/app/docs/components/primitives/DocList.tsx`        | `bg-slate-100`, `border-slate-200`, `bg-slate-700`, `text-slate-600`               |
| `src/app/docs/components/primitives/DocSection.tsx`     | `bg-slate-700`, `bg-white`                                                         |

#### Quarterly Summary Section

**⚠️ STILL PENDING**: Fix hardcoded light backgrounds and status colors in Quarterly Summary. (Note: The quarterly summary section was not part of this fix pass - to be addressed separately)

| File                                                                          | Issues                                                                                                                          |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/app/goal/[goalId]/quarterly-summary/page.tsx`                        | `bg-gray-50`, `bg-white`, `bg-gray-100`, `text-blue-700`, `bg-blue-100`                                                         |
| `src/components/molecules/quarterly-summary/QuarterlySummaryMarkdownView.tsx` | `bg-gray-50`, `text-gray-900`, `text-gray-600`, `text-gray-700`, `text-gray-800`, `text-gray-500`                               |
| `src/components/molecules/quarterly-summary/QuarterSummaryResults.tsx`        | `bg-white`, `text-gray-900`, `text-gray-500`, `text-gray-800`, `bg-blue-100`, `text-blue-700`, `bg-green-100`, `text-green-600` |
| `src/components/molecules/quarterly-summary/QuarterlyGoalSummaryView.tsx`     | `text-gray-900`, `text-gray-500`, `text-gray-700`                                                                               |

---

### 🟠 High Priority (Core Components with Issues)

#### Week/Day Views

**✅ COMPLETED**: Updated Week/Day components to use `bg-card` and semantic text colors. Fixed hardcoded status backgrounds (`bg-green-50` etc.) to have `dark:` variants.

| File                                                            | Problematic Classes                                                                 |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/components/molecules/week/WeekCard.tsx`                    | `bg-white`, `text-gray-500`                                                         |
| `src/components/organisms/DailyGoalGroup.tsx`                   | `bg-white`, `bg-green-50`, `bg-blue-50`, `bg-yellow-50`, `text-gray-600`            |
| `src/components/organisms/DailyGoalList.tsx`                    | `bg-green-50`, `text-gray-500`                                                      |
| `src/components/organisms/WeekCardWeeklyGoals.tsx`              | `bg-green-50`, `hover:bg-gray-50/50`, `text-gray-800`, `bg-yellow-50`, `bg-blue-50` |
| `src/components/molecules/day-of-week/components/DayHeader.tsx` | `bg-gray-100`, `text-gray-900`, `text-gray-500`                                     |

#### Focus Mode Components

**✅ COMPLETED**: Fixed Focus Mode components to use `bg-card` instead of `bg-white`.

| File                                                    | Problematic Classes                |
| ------------------------------------------------------- | ---------------------------------- |
| `src/components/organisms/focus/FocusModeDailyView.tsx` | `bg-white`                         |
| `src/components/organisms/focus/OnFireGoalsSection.tsx` | `bg-red-50` (missing dark variant) |
| `src/components/organisms/DashboardFocusView.tsx`       | `bg-white`                         |

#### Goal Item Variants

**✅ COMPLETED**: Fixed hover states on goal items to use `hover:bg-accent/50` instead of `hover:bg-gray-50`.

| File                                                                     | Problematic Classes                                         |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `src/components/molecules/goal-list-item/variants/DailyGoalItem.tsx`     | `hover:bg-gray-50/50`                                       |
| `src/components/molecules/goal-list-item/variants/WeeklyGoalItem.tsx`    | `hover:bg-gray-50/50`                                       |
| `src/components/molecules/goal-list-item/variants/QuarterlyGoalItem.tsx` | `hover:bg-gray-50`, `text-gray-600` (has partial dark mode) |

#### Dialogs and Modals

**✅ COMPLETED**: Updated dialogs to use semantic colors. Added dark mode variants to preview colors (yellow/blue/green backgrounds).

| File                                                                  | Problematic Classes                                                                                                                                                                                 |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/organisms/GoalDeletePreviewDialog.tsx`                | `text-gray-500`, `bg-gray-50`, `border-gray-200`, `bg-yellow-50`, `bg-blue-50`, `bg-green-50`, `bg-yellow-100`, `bg-blue-100`, `bg-green-100`, `text-yellow-800`, `text-blue-800`, `text-green-800` |
| `src/components/organisms/WeekCardPreviewDialog.tsx`                  | `text-gray-500` (has some dark mode)                                                                                                                                                                |
| `src/components/molecules/quarter/QuarterGoalMovePreview.tsx`         | `text-gray-500`, `text-gray-600`, `text-gray-900`, `text-gray-800`, `bg-gray-50`, `border-gray-200`                                                                                                 |
| `src/components/molecules/day-of-week/components/TaskMovePreview.tsx` | `text-gray-500`, `text-gray-800`                                                                                                                                                                    |

---

### 🟡 Medium Priority (Secondary Components)

#### Input Components

**✅ COMPLETED**: Fixed input borders and hover states to use `border-input` and `hover:bg-accent/50`.

| File                                                                                  | Problematic Classes                   |
| ------------------------------------------------------------------------------------- | ------------------------------------- |
| `src/components/atoms/CreateGoalInput.tsx`                                            | `hover:bg-gray-50`, `border-gray-100` |
| `src/components/molecules/goal-details-popover/view/components/AdhocSubGoalsList.tsx` | `hover:bg-gray-50` (has dark variant) |
| `src/modules/checklist/checklist-inline-input.tsx`                                    | `border-gray-300`, `border-gray-400`  |

#### UI Components

**✅ COMPLETED**: Standardized spinner and collapsible components to use semantic colors.

| File                                        | Problematic Classes |
| ------------------------------------------- | ------------------- |
| `src/components/ui/spinner.tsx`             | `border-gray-300`   |
| `src/components/ui/collapsible-minimal.tsx` | `bg-gray-50`        |

#### Selectors/Pickers

**✅ COMPLETED**: Updated to use semantic text colors (`text-muted-foreground`).

| File                                    | Problematic Classes |
| --------------------------------------- | ------------------- |
| `src/components/atoms/GoalSelector.tsx` | `text-gray-500`     |
| `src/components/atoms/GoalStarPin.tsx`  | `text-gray-400`     |

#### Multi-Week Grid

**✅ COMPLETED**: Fixed white background to use `bg-card/90` with proper dark mode support.

| File                                                    | Problematic Classes               |
| ------------------------------------------------------- | --------------------------------- |
| `src/components/molecules/multi-week/MultiWeekGrid.tsx` | `bg-white/90`, `hover:bg-blue-50` |

---

### 🟢 Low Priority (Test Pages, Edge Cases)

| File                                 | Problematic Classes                            |
| ------------------------------------ | ---------------------------------------------- |
| `src/app/page.tsx` (landing)         | `bg-white`, `text-blue-700`, `border-blue-200` |
| `src/app/test/shadcn-modal/page.tsx` | Various test colors (acceptable for test page) |
| `src/app/test/page.tsx`              | Test colors (acceptable)                       |

---

## Special Cases Requiring Review

### 1. Domain Pill Color System

**File**: `src/components/atoms/DomainPill/lib/colors.ts`

**Current Implementation**:

- Uses dynamic hex-to-RGB conversion
- Calculates luminance for text contrast
- Default colors use hardcoded RGB values (gray theme)

**Issue**: The default colors don't adapt to dark mode:

```ts
const DEFAULT_COLORS: DomainPillColors = {
  foreground: "rgb(55, 65, 81)", // gray-700 - too dark for dark mode
  background: "rgb(243, 244, 246)", // gray-100 - too light for dark mode
  border: "rgb(229, 231, 235)", // gray-200 - invisible in dark mode
  dotColor: "rgb(107, 114, 128)", // gray-500 - may be ok
};
```

**✅ COMPLETED**: Updated `getDomainPillColors` to accept `isDarkMode` boolean and return appropriate RGB values for dark mode (lighter text, darker background).

---

### 2. Inline Style Colors

**Files with inline `style={{ backgroundColor: ... }}`**:

- `src/app/app/goal/quarterly-summary/SelectorPanels.tsx`
- `src/components/organisms/AdhocGoalList.tsx`
- `src/components/molecules/quarterly-summary/AdhocDomainSelector.tsx`
- `src/components/atoms/DomainSelector.tsx`
- `src/components/atoms/DomainPill/view/DomainPillView.tsx`

**✅ COMPLETED**: Updated `DomainPillView` to use `useIsDarkMode()` hook and pass it to `getDomainPillColors()`. The function now generates appropriate light/dark text colors based on the domain color luminance and current theme mode.

---

### 3. Status Colors Pattern

Multiple files use status colors (green/blue/yellow/red) for different states without dark variants:

**Pattern Found**:

```tsx
// Missing dark variants
bg - green - 50; // Complete state
bg - blue - 50; // Pinned state
bg - yellow - 50; // Starred state
bg - red - 50; // On-fire/urgent state
```

**Correct Pattern Should Be**:

```tsx
bg-green-50 dark:bg-green-950/20
bg-blue-50 dark:bg-blue-950/20
bg-yellow-50 dark:bg-yellow-950/20
bg-red-50 dark:bg-red-950/20
```

**Files Requiring This Fix**:

- `DailyGoalGroup.tsx`
- `DailyGoalList.tsx`
- `WeekCardWeeklyGoals.tsx`
- `GoalDeletePreviewDialog.tsx`
- `OnFireGoalsSection.tsx`
- `TaskMovePreview.tsx`
- `QuarterGoalMovePreview.tsx`
- `WeekCard.tsx` (for current week highlight)

**✅ COMPLETED**: Applied this pattern globally. Created `src/lib/colors/statusColors.ts` for standardized status color patterns.

---

### 4. Text Color Hierarchy Issues

Many files use direct gray scale values instead of semantic colors:

**Problematic Pattern**:

```tsx
text - gray - 900; // Headings - too dark in dark mode
text - gray - 800; // Primary content
text - gray - 700; // Standard text
text - gray - 600; // Secondary text
text - gray - 500; // Tertiary/muted text
```

**Correct Semantic Alternatives**:

| Current         | Replacement                               |
| --------------- | ----------------------------------------- |
| `text-gray-900` | `text-foreground`                         |
| `text-gray-800` | `text-foreground`                         |
| `text-gray-700` | `text-foreground` or `text-foreground/90` |
| `text-gray-600` | `text-muted-foreground`                   |
| `text-gray-500` | `text-muted-foreground`                   |

**✅ COMPLETED**: Replaced gray scale values with semantic tokens in core components.

---

## Recommendations

### Phase 1: Quick Wins (Estimated: 2-4 hours)

1. **Update `spinner.tsx`** - Single file fix

   - Change `border-gray-300` to `border-muted`

2. **Update `collapsible-minimal.tsx`** - Single file fix

   - Change `bg-gray-50` to `bg-muted` or add `dark:bg-gray-900`

3. **Fix status color patterns** in goal components
   - Add `dark:bg-{color}-950/20` to all `bg-{color}-50` classes

### Phase 2: Core Component Fixes (Estimated: 4-8 hours)

1. **Week/Day view components**

   - `WeekCard.tsx`
   - `DailyGoalGroup.tsx`
   - `DailyGoalList.tsx`
   - `WeekCardWeeklyGoals.tsx`
   - `DayHeader.tsx`

2. **Goal item variants**

   - `DailyGoalItem.tsx`
   - `WeeklyGoalItem.tsx`
   - `QuarterlyGoalItem.tsx`

3. **Focus mode components**
   - `FocusModeDailyView.tsx`
   - `FocusModeWeeklyView.tsx`
   - `OnFireGoalsSection.tsx`
   - `DashboardFocusView.tsx`

### Phase 3: Dialog/Modal Fixes (Estimated: 4-6 hours)

1. **Preview dialogs**

   - `GoalDeletePreviewDialog.tsx`
   - `WeekCardPreviewDialog.tsx`
   - `QuarterGoalMovePreview.tsx`
   - `TaskMovePreview.tsx`

2. **Quarterly summary components**
   - All files in `quarterly-summary/` folder

### Phase 4: Documentation Section Overhaul (Estimated: 6-8 hours)

The entire `/docs` section needs a comprehensive dark mode pass:

- Replace all `slate-*` and direct color classes with semantic alternatives
- Or add systematic `dark:` variants throughout

**Recommended Approach**: Create a docs-specific color scheme in the component primitives that respects dark mode.

### Phase 5: Domain Color System Enhancement (Estimated: 2-4 hours)

1. Update `getDomainPillColors()` to accept a `isDarkMode` parameter
2. Adjust default colors and generated colors for dark mode contexts
3. Test contrast ratios for user-defined colors in both modes

---

## Testing Checklist

For each fixed component:

- [ ] Test in light mode - verify original appearance preserved
- [ ] Test in dark mode - verify readable contrast
- [ ] Test system mode - verify follows OS preference
- [ ] Test theme toggle - verify smooth transition
- [ ] Check status indicator colors (starred/pinned/complete/on-fire)
- [ ] Verify hover states work in both modes
- [ ] Check any custom/user-defined colors still display correctly

---

## Summary Statistics

| Category              | Files Affected | Priority |
| --------------------- | -------------- | -------- |
| Documentation section | 11 files       | Critical |
| Quarterly summary     | 5 files        | Critical |
| Week/Day views        | 5 files        | High     |
| Focus mode            | 4 files        | High     |
| Goal item variants    | 3 files        | High     |
| Dialogs/Modals        | 4 files        | High     |
| Input components      | 3 files        | Medium   |
| UI components         | 2 files        | Medium   |
| Selectors             | 2 files        | Medium   |
| Other                 | 3 files        | Low      |

**Total Files Requiring Updates**: ~42 files
**Estimated Total Effort**: 18-30 hours

---

## Implementation Progress

### ✅ Completed (December 12, 2025)

| Category              | Files Fixed                                                                                           | Status      |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ----------- |
| Status Colors Utility | Created `src/lib/colors/statusColors.ts`                                                              | ✅ New file |
| UI Components         | `spinner.tsx`, `collapsible-minimal.tsx`                                                              | ✅ Fixed    |
| Domain Pill           | `colors.ts` with `isDarkMode` support                                                                 | ✅ Fixed    |
| Week/Day Views        | `WeekCard.tsx`, `DailyGoalGroup.tsx`, `DailyGoalList.tsx`, `WeekCardWeeklyGoals.tsx`, `DayHeader.tsx` | ✅ Fixed    |
| Focus Mode            | `FocusModeDailyView.tsx`, `OnFireGoalsSection.tsx`, `DashboardFocusView.tsx`                          | ✅ Fixed    |
| Goal Item Variants    | `DailyGoalItem.tsx`, `WeeklyGoalItem.tsx`, `QuarterlyGoalItem.tsx`                                    | ✅ Fixed    |
| Dialogs/Modals        | `GoalDeletePreviewDialog.tsx`, `QuarterGoalMovePreview.tsx`, `TaskMovePreview.tsx`                    | ✅ Fixed    |
| Input Components      | `CreateGoalInput.tsx`, `checklist-inline-input.tsx`                                                   | ✅ Fixed    |
| Selectors             | `GoalSelector.tsx`, `GoalStarPin.tsx`                                                                 | ✅ Fixed    |
| Multi-Week Grid       | `MultiWeekGrid.tsx`                                                                                   | ✅ Fixed    |

### ⚠️ Still Pending

| Category              | Files                 | Notes                                                      |
| --------------------- | --------------------- | ---------------------------------------------------------- |
| Documentation Section | 11 files in `/docs/*` | Uses `slate-*` colors - requires separate refactoring pass |
| Quarterly Summary     | 4 files               | Contains hardcoded gray/white backgrounds                  |
| Inline Style Colors   | 4 remaining files     | DomainPillView fixed; others still need `isDarkMode` prop  |

---

_Document generated: December 12, 2025_
_Last updated: December 12, 2025_
