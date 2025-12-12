# Theming & Colors Codemap

> **Purpose**: Complete reference for the application's theming system, color architecture, and design tokens.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Color Token System](#color-token-system)
3. [Brand & Domain Colors](#brand--domain-colors)
4. [Semantic Status Colors](#semantic-status-colors)
5. [Typography & Spacing System](#typography--spacing-system)
6. [Component Color Patterns](#component-color-patterns)
7. [Review Items & Recommendations](#review-items--recommendations)

---

## Architecture Overview

### Technology Stack

| Layer          | Technology              | File                 |
| -------------- | ----------------------- | -------------------- |
| CSS Framework  | Tailwind CSS v4         | `tailwind.config.ts` |
| Color Space    | OKLCH                   | `globals.css`        |
| Theme Provider | next-themes + custom    | `ThemeProvider.tsx`  |
| Animations     | tailwindcss-animate     | Plugin               |
| Typography     | @tailwindcss/typography | Plugin               |

### Theme Switching Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  User selects theme (light/dark/system)                         │
│                           ↓                                     │
│  window.__theme.setTheme() → localStorage.setItem('theme')      │
│                           ↓                                     │
│  document.documentElement.classList.add/remove('dark')          │
│                           ↓                                     │
│  CSS variables in .dark {} become active                        │
│                           ↓                                     │
│  All semantic colors (bg-background, text-foreground) update    │
└─────────────────────────────────────────────────────────────────┘
```

### Core Files

```
apps/webapp/
├── tailwind.config.ts              # Tailwind configuration
├── src/
│   ├── app/globals.css             # CSS variables & base styles
│   └── modules/theme/
│       ├── ThemeProvider.tsx       # React context + flash prevention
│       ├── ThemeSettings.tsx       # Theme selection UI
│       └── theme-utils.ts          # Type definitions
```

---

## Color Token System

### Primary Semantic Tokens

These tokens automatically adapt to light/dark mode:

#### Core Colors

| Token                  | Light Mode                      | Dark Mode                       | Usage               |
| ---------------------- | ------------------------------- | ------------------------------- | ------------------- |
| `--background`         | `oklch(1 0 0)` (white)          | `oklch(0.145 0 0)` (near-black) | Page background     |
| `--foreground`         | `oklch(0.145 0 0)` (near-black) | `oklch(0.985 0 0)` (near-white) | Primary text        |
| `--card`               | `oklch(1 0 0)`                  | `oklch(0.205 0 0)`              | Card backgrounds    |
| `--card-foreground`    | `oklch(0.145 0 0)`              | `oklch(0.985 0 0)`              | Card text           |
| `--popover`            | `oklch(1 0 0)`                  | `oklch(0.205 0 0)`              | Popover/dropdown bg |
| `--popover-foreground` | `oklch(0.145 0 0)`              | `oklch(0.985 0 0)`              | Popover text        |

#### Interactive Colors

| Token                    | Light Mode                | Dark Mode                  | Usage             |
| ------------------------ | ------------------------- | -------------------------- | ----------------- |
| `--primary`              | `oklch(0.205 0 0)` (dark) | `oklch(0.922 0 0)` (light) | Primary buttons   |
| `--primary-foreground`   | `oklch(0.985 0 0)`        | `oklch(0.205 0 0)`         | Text on primary   |
| `--secondary`            | `oklch(0.97 0 0)`         | `oklch(0.269 0 0)`         | Secondary buttons |
| `--secondary-foreground` | `oklch(0.205 0 0)`        | `oklch(0.985 0 0)`         | Text on secondary |
| `--accent`               | `oklch(0.97 0 0)`         | `oklch(0.269 0 0)`         | Hover states      |
| `--accent-foreground`    | `oklch(0.205 0 0)`        | `oklch(0.985 0 0)`         | Text on accent    |
| `--muted`                | `oklch(0.97 0 0)`         | `oklch(0.269 0 0)`         | Muted backgrounds |
| `--muted-foreground`     | `oklch(0.556 0 0)`        | `oklch(0.708 0 0)`         | Secondary text    |

#### Utility Colors

| Token                      | Light Mode                        | Dark Mode                   | Usage                |
| -------------------------- | --------------------------------- | --------------------------- | -------------------- |
| `--destructive`            | `oklch(0.577 0.245 27.325)` (red) | `oklch(0.704 0.191 22.216)` | Delete/error actions |
| `--destructive-foreground` | `oklch(0.985 0 0)`                | `oklch(0.145 0 0)`          | Text on destructive  |
| `--border`                 | `oklch(0.922 0 0)`                | `oklch(1 0 0 / 10%)`        | Default borders      |
| `--input`                  | `oklch(0.922 0 0)`                | `oklch(1 0 0 / 15%)`        | Input borders        |
| `--ring`                   | `oklch(0.708 0 0)`                | `oklch(0.556 0 0)`          | Focus rings          |

#### Chart Colors

| Token       | Light Mode                  | Dark Mode                    | Usage          |
| ----------- | --------------------------- | ---------------------------- | -------------- |
| `--chart-1` | `oklch(0.646 0.222 41.116)` | `oklch(0.488 0.243 264.376)` | Chart series 1 |
| `--chart-2` | `oklch(0.6 0.118 184.704)`  | `oklch(0.696 0.17 162.48)`   | Chart series 2 |
| `--chart-3` | `oklch(0.398 0.07 227.392)` | `oklch(0.769 0.188 70.08)`   | Chart series 3 |
| `--chart-4` | `oklch(0.828 0.189 84.429)` | `oklch(0.627 0.265 303.9)`   | Chart series 4 |
| `--chart-5` | `oklch(0.769 0.188 70.08)`  | `oklch(0.645 0.246 16.439)`  | Chart series 5 |

#### Sidebar Colors

| Token                          | Light Mode         | Dark Mode                    | Usage               |
| ------------------------------ | ------------------ | ---------------------------- | ------------------- |
| `--sidebar`                    | `oklch(0.985 0 0)` | `oklch(0.205 0 0)`           | Sidebar background  |
| `--sidebar-foreground`         | `oklch(0.145 0 0)` | `oklch(0.985 0 0)`           | Sidebar text        |
| `--sidebar-primary`            | `oklch(0.205 0 0)` | `oklch(0.488 0.243 264.376)` | Sidebar active      |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)`           | Sidebar active text |
| `--sidebar-accent`             | `oklch(0.97 0 0)`  | `oklch(0.269 0 0)`           | Sidebar hover       |
| `--sidebar-accent-foreground`  | `oklch(0.205 0 0)` | `oklch(0.985 0 0)`           | Sidebar hover text  |
| `--sidebar-border`             | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)`         | Sidebar borders     |
| `--sidebar-ring`               | `oklch(0.708 0 0)` | `oklch(0.556 0 0)`           | Sidebar focus       |

### Tailwind Class Mapping

The semantic tokens are mapped to Tailwind classes:

```css
/* tailwind.config.ts */
colors: {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  card: {
    DEFAULT: 'hsl(var(--card))',
    foreground: 'hsl(var(--card-foreground))',
  },
  // ... etc
}
```

**Usage in Components:**

```tsx
// ✅ Correct - uses semantic tokens
<div className="bg-background text-foreground">
<div className="bg-card text-card-foreground">
<div className="text-muted-foreground">
<Button className="bg-primary text-primary-foreground">
```

---

## Brand & Domain Colors

### Apple-Inspired Color Palette

**File**: `src/components/atoms/DomainSelector.tsx`

The domain color picker uses an Apple-inspired palette:

```typescript
const COLOR_PRESETS = [
  { name: "Red", value: "#FF3B30", light: "#FF453A", dark: "#FF453A" },
  { name: "Orange", value: "#FF9500", light: "#FF9F0A", dark: "#FF9F0A" },
  { name: "Yellow", value: "#FFCC00", light: "#FFD60A", dark: "#FFD60A" },
  { name: "Green", value: "#34C759", light: "#30D158", dark: "#30D158" },
  { name: "Mint", value: "#00C7BE", light: "#63E6E2", dark: "#63E6E2" },
  { name: "Teal", value: "#30B0C7", light: "#40CBE0", dark: "#40CBE0" },
  { name: "Cyan", value: "#32ADE6", light: "#64D2FF", dark: "#64D2FF" },
  { name: "Blue", value: "#007AFF", light: "#0A84FF", dark: "#0A84FF" }, // Default
  { name: "Indigo", value: "#5856D6", light: "#5E5CE6", dark: "#5E5CE6" },
  { name: "Purple", value: "#AF52DE", light: "#BF5AF2", dark: "#BF5AF2" },
  { name: "Pink", value: "#FF2D55", light: "#FF375F", dark: "#FF375F" },
  { name: "Brown", value: "#A2845E", light: "#AC8E68", dark: "#AC8E68" },
  { name: "Gray", value: "#8E8E93", light: "#98989D", dark: "#98989D" },
];
```

**Default Color**: Blue (`#007AFF`)

### Domain Color Processing

**File**: `src/components/atoms/DomainPill/lib/colors.ts`

Domain colors are processed for accessibility:

```typescript
interface DomainPillColors {
  foreground: string;   // Text color (auto-darkened for light colors)
  background: string;   // 25% opacity of domain color
  border: string;       // 50% opacity of domain color
  dotColor: string;     // Full domain color
}

// Example output for #007AFF (Blue):
{
  foreground: 'rgb(0, 122, 255)',        // Original (dark enough)
  background: 'rgba(0, 122, 255, 0.25)', // Subtle background
  border: 'rgba(0, 122, 255, 0.5)',      // Medium border
  dotColor: 'rgb(0, 122, 255)',          // Full color dot
}
```

**✅ FIXED**: Updated `getDomainPillColors()` to accept `isDarkMode` parameter. Now generates appropriate text colors based on luminance AND theme mode:
- Light mode: Darkens light colors for contrast on white backgrounds
- Dark mode: Uses original color or lightens dark colors for contrast on dark backgrounds
- Added `useIsDarkMode()` hook to `ThemeProvider.tsx` for detecting resolved theme
- `DomainPillView` now passes `isDarkMode` to color calculation

### Domain Color Usage

| Component      | File                                        | How Color is Applied                        |
| -------------- | ------------------------------------------- | ------------------------------------------- |
| DomainPill     | `DomainPill/view/DomainPillView.tsx`        | Inline styles via `getDomainPillColors()`   |
| DomainBadge    | `atoms/DomainBadge.tsx`                     | Inline `backgroundColor` with 40% opacity   |
| DomainSelector | `atoms/DomainSelector.tsx`                  | Inline `backgroundColor` for color swatches |
| SelectorPanels | `goal/quarterly-summary/SelectorPanels.tsx` | Inline `backgroundColor`                    |
| AdhocGoalList  | `organisms/AdhocGoalList.tsx`               | Inline `backgroundColor`                    |

---

## Semantic Status Colors

The app uses color to indicate goal states. These are currently **not dark-mode compatible**.

### Goal State Colors

| State           | Current Pattern                                      | Where Used              |
| --------------- | ---------------------------------------------------- | ----------------------- |
| **Starred** ⭐  | `bg-yellow-50`, `fill-yellow-400`, `text-yellow-400` | Goal highlighting       |
| **Pinned** 📌   | `bg-blue-50`, `fill-blue-400`, `text-blue-400`       | Pinned goals            |
| **Complete** ✅ | `bg-green-50`, `text-green-600`                      | Soft-complete state     |
| **On Fire** 🔥  | `bg-red-50`                                          | Urgent goals            |
| **Selected**    | `bg-blue-50`, `border-blue-200`                      | Selected items in lists |

### Icon Colors (Consistent)

| Icon            | Classes                               | Note                       |
| --------------- | ------------------------------------- | -------------------------- |
| Star (active)   | `fill-yellow-400 text-yellow-400`     | ✅ Works in both modes     |
| Star (inactive) | `text-gray-400 hover:text-yellow-500` | ⚠️ Gray needs dark variant |
| Pin (active)    | `fill-blue-400 text-blue-400`         | ✅ Works in both modes     |
| Pin (inactive)  | `text-gray-400 hover:text-blue-500`   | ⚠️ Gray needs dark variant |

### Recommended Dark Mode Pairs

| Light Mode          | Dark Mode                | Semantic        |
| ------------------- | ------------------------ | --------------- |
| `bg-yellow-50`      | `dark:bg-yellow-950/20`  | Starred         |
| `bg-blue-50`        | `dark:bg-blue-950/20`    | Pinned          |
| `bg-green-50`       | `dark:bg-green-950/20`   | Complete        |
| `bg-red-50`         | `dark:bg-red-950/20`     | On Fire         |
| `text-yellow-800`   | `dark:text-yellow-400`   | Starred text    |
| `text-blue-800`     | `dark:text-blue-400`     | Pinned text     |
| `text-green-800`    | `dark:text-green-400`    | Complete text   |
| `text-red-800`      | `dark:text-red-400`      | On Fire text    |
| `border-yellow-200` | `dark:border-yellow-800` | Starred border  |
| `border-blue-200`   | `dark:border-blue-800`   | Pinned border   |
| `border-green-200`  | `dark:border-green-800`  | Complete border |
| `border-red-200`    | `dark:border-red-800`    | On Fire border  |

---

## Typography & Spacing System

### Font System

```css
/* globals.css */
--font-sans: var(--font-geist-sans);
--font-mono: var(--font-geist-mono);
```

### Responsive Spacing Variables

**Desktop (default)**:

```css
:root {
  --spacing-xs: 0.25rem; /* 4px */
  --spacing-sm: 0.5rem; /* 8px */
  --spacing-md: 1rem; /* 16px */
  --spacing-lg: 1.5rem; /* 24px */
  --spacing-xl: 2rem; /* 32px */
  --spacing-2xl: 3rem; /* 48px */
}
```

**Mobile (max-width: 640px)**:

```css
:root {
  --spacing-xs: 0.125rem; /* 2px */
  --spacing-sm: 0.25rem; /* 4px */
  --spacing-md: 0.5rem; /* 8px */
  --spacing-lg: 0.75rem; /* 12px */
  --spacing-xl: 1rem; /* 16px */
  --spacing-2xl: 1.5rem; /* 24px */
}
```

### Responsive Font Sizes

**Desktop**:

```css
--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */
--text-3xl: 1.875rem; /* 30px */
```

**Mobile**:

```css
--text-xs: 0.625rem; /* 10px */
--text-sm: 0.75rem; /* 12px */
--text-base: 0.875rem; /* 14px */
--text-lg: 1rem; /* 16px */
--text-xl: 1.125rem; /* 18px */
--text-2xl: 1.25rem; /* 20px */
--text-3xl: 1.5rem; /* 24px */
```

### Component Size Variables

| Variable             | Desktop | Mobile  |
| -------------------- | ------- | ------- |
| `--button-height-sm` | 2rem    | 1.75rem |
| `--button-height-md` | 2.25rem | 2rem    |
| `--button-height-lg` | 2.5rem  | 2.25rem |
| `--input-height`     | 2.25rem | 2rem    |
| `--header-height`    | 4rem    | 3.5rem  |

### Border Radius System

```css
--radius: 0.625rem; /* 10px - base */
--radius-sm: calc(var(--radius) - 4px); /* 6px */
--radius-md: calc(var(--radius) - 2px); /* 8px */
--radius-lg: var(--radius); /* 10px */
--radius-xl: calc(var(--radius) + 4px); /* 14px */
```

### Mobile Utility Classes

Custom responsive utilities in `globals.css`:

```css
/* Spacing */
.space-mobile  → @apply space-y-2 sm:space-y-4
.gap-mobile    → @apply gap-2 sm:gap-4
.p-mobile      → @apply p-2 sm:p-4
.px-mobile     → @apply px-2 sm:px-4
.py-mobile     → @apply py-2 sm:py-4

/* Typography */
.text-mobile-xs   → @apply text-xs sm:text-sm
.text-mobile-sm   → @apply text-sm sm:text-base
.text-mobile-base → @apply text-sm sm:text-lg
.text-mobile-lg   → @apply text-base sm:text-xl
.text-mobile-xl   → @apply text-lg sm:text-2xl

/* Components */
.card-mobile   → @apply p-3 sm:p-6 space-y-2 sm:space-y-4
.dialog-mobile → @apply max-w-[95vw] sm:max-w-lg p-4 sm:p-6
```

---

## Component Color Patterns

### ShadCN Base Components

All ShadCN components use semantic colors correctly:

| Component            | Key Classes                                    |
| -------------------- | ---------------------------------------------- |
| Button (default)     | `bg-primary text-primary-foreground`           |
| Button (destructive) | `bg-destructive text-destructive-foreground`   |
| Button (outline)     | `border-input bg-background hover:bg-accent`   |
| Button (secondary)   | `bg-secondary text-secondary-foreground`       |
| Button (ghost)       | `hover:bg-accent hover:text-accent-foreground` |
| Card                 | `bg-card text-card-foreground border`          |
| Badge                | `bg-primary text-primary-foreground`           |
| Input                | `border-input bg-transparent`                  |

### Current Week Highlight

**File**: `src/components/molecules/week/WeekCard.tsx`

```tsx
// Current implementation - needs review
isCurrentWeek && "ring-2 ring-blue-500";
isCurrentWeek && "bg-blue-50";
```

**✅ FIXED**: Updated to use `ring-blue-500 dark:ring-blue-400` and `bg-blue-50 dark:bg-blue-950/20`.

### Focus Ring Pattern

The app uses a consistent focus ring pattern:

```tsx
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```

Where `ring` is the semantic token that adapts to dark mode.

---

## Review Items & Recommendations

### 🔴 Critical: Domain Pill Default Colors

**File**: `src/components/atoms/DomainPill/lib/colors.ts`

**Current**:

```typescript
const DEFAULT_COLORS: DomainPillColors = {
  foreground: "rgb(55, 65, 81)", // gray-700
  background: "rgb(243, 244, 246)", // gray-100
  border: "rgb(229, 231, 235)", // gray-200
  dotColor: "rgb(107, 114, 128)", // gray-500
};
```

**Recommendation**: Accept `isDarkMode` parameter and return appropriate colors:

```typescript
const DEFAULT_COLORS_LIGHT: DomainPillColors = {
  foreground: "rgb(55, 65, 81)",
  background: "rgb(243, 244, 246)",
  border: "rgb(229, 231, 235)",
  dotColor: "rgb(107, 114, 128)",
};

const DEFAULT_COLORS_DARK: DomainPillColors = {
  foreground: "rgb(209, 213, 219)", // gray-300
  background: "rgb(31, 41, 55)", // gray-800
  border: "rgb(55, 65, 81)", // gray-700
  dotColor: "rgb(156, 163, 175)", // gray-400
};
```

**✅ COMPLETED**: Implemented `isDarkMode` parameter in `getDomainPillColors()` with `DEFAULT_COLORS_LIGHT` and `DEFAULT_COLORS_DARK` constants.

---

### 🟠 High: Standardize Status Color Pattern

Create a utility for consistent status colors:

**Proposed**: `src/lib/colors/statusColors.ts`

```typescript
export const statusColors = {
  starred: {
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
    text: "text-yellow-800 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-800",
    icon: "fill-yellow-400 text-yellow-400",
  },
  pinned: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-800 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    icon: "fill-blue-400 text-blue-400",
  },
  complete: {
    bg: "bg-green-50 dark:bg-green-950/20",
    text: "text-green-800 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  onFire: {
    bg: "bg-red-50 dark:bg-red-950/20",
    text: "text-red-800 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  selected: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
  },
} as const;
```

**✅ COMPLETED**: Created `src/lib/colors/statusColors.ts` with standardized status color patterns including `starred`, `pinned`, `complete`, `onFire`, `selected`, and `currentWeek` states.

---

### 🟡 Medium: Documentation Section Color Scheme

The `/docs` section uses a completely different color system (`slate-*` instead of semantic tokens).

**Options**:

1. **Full migration**: Replace all `slate-*` with semantic tokens
2. **Docs-specific theme**: Create docs primitives that use semantic tokens internally
3. **Add dark variants**: Keep slate but add `dark:` variants throughout

**Recommendation**: Option 2 - Update the primitives in `src/app/docs/components/primitives/` to use semantic tokens, which will cascade to all docs pages.

**✅ COMPLETED**: The docs section has been refactored to use semantic tokens (`bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`) instead of `slate-*` colors.

---

### 🟢 Low: Theme Transition Optimization

Current implementation applies transitions broadly. Consider:

```css
/* Current - applies to many elements */
button,
input,
.card,
.border,
[class*="border-"] {
  transition: border-color 0.2s, box-shadow 0.2s;
}

/* Optimized - only theme-relevant properties */
:root {
  --theme-transition: background-color 0.2s, color 0.2s, border-color 0.2s;
}
```

**ℹ️ LOW PRIORITY**: Review `globals.css` transition rules for potential optimization.

---

## Quick Reference: Color Token to Class Mapping

| CSS Variable               | Tailwind Class                | Usage                    |
| -------------------------- | ----------------------------- | ------------------------ |
| `--background`             | `bg-background`               | Page/section backgrounds |
| `--foreground`             | `text-foreground`             | Primary text             |
| `--card`                   | `bg-card`                     | Card backgrounds         |
| `--card-foreground`        | `text-card-foreground`        | Card text                |
| `--muted`                  | `bg-muted`                    | Muted backgrounds        |
| `--muted-foreground`       | `text-muted-foreground`       | Secondary text           |
| `--accent`                 | `bg-accent`                   | Hover states             |
| `--accent-foreground`      | `text-accent-foreground`      | Hover text               |
| `--primary`                | `bg-primary`                  | Primary actions          |
| `--primary-foreground`     | `text-primary-foreground`     | Primary action text      |
| `--secondary`              | `bg-secondary`                | Secondary actions        |
| `--secondary-foreground`   | `text-secondary-foreground`   | Secondary action text    |
| `--destructive`            | `bg-destructive`              | Destructive actions      |
| `--destructive-foreground` | `text-destructive-foreground` | Destructive action text  |
| `--border`                 | `border-border`               | Default borders          |
| `--input`                  | `border-input`                | Input borders            |
| `--ring`                   | `ring-ring`                   | Focus rings              |

---

_Document generated: December 12, 2025_
