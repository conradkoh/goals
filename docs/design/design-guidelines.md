# Design Guidelines & Best Practices

> **Status**: Living Document
> **Purpose**: Definitive guide for UI implementation, theming, and dark mode compliance.

---

## 1. The Golden Rules of Theming

### Rule #1: Semantic Over Specific

**Never** use raw color values (e.g., `bg-white`, `text-gray-900`) for structural elements. Always use the semantic tokens defined in `globals.css` and `tailwind.config.ts`.

| Element Type    | ❌ Bad (Hardcoded)                 | ✅ Good (Semantic)      |
| --------------- | ---------------------------------- | ----------------------- |
| Page Background | `bg-white`                         | `bg-background`         |
| Card Background | `bg-white` or `bg-gray-50`         | `bg-card`               |
| Primary Text    | `text-black` or `text-gray-900`    | `text-foreground`       |
| Secondary Text  | `text-gray-500` or `text-gray-600` | `text-muted-foreground` |
| Borders         | `border-gray-200`                  | `border-border`         |
| Input Borders   | `border-gray-300`                  | `border-input`          |

### Rule #2: Dark Mode First

When implementing any color that isn't a semantic token (like a specific status color), **always** include a `dark:` variant immediately.

```tsx
// ❌ Bad: Looks good in light mode, invisible or blinding in dark mode
<div className="bg-blue-50 text-blue-900">Information</div>

// ✅ Good: Adjusted opacity and lightness for dark mode
<div className="bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">Information</div>
```

---

## 2. Status & Semantic Colors

We use specific colors for goal states. These must be implemented consistently with dark mode support.

### Standard Status Palette

Use this reference when implementing status indicators:

| State           | Background (Container)               | Text/Icon                              | Border                                     |
| --------------- | ------------------------------------ | -------------------------------------- | ------------------------------------------ |
| **Starred** ⭐  | `bg-yellow-50 dark:bg-yellow-950/20` | `text-yellow-800 dark:text-yellow-400` | `border-yellow-200 dark:border-yellow-800` |
| **Pinned** 📌   | `bg-blue-50 dark:bg-blue-950/20`     | `text-blue-800 dark:text-blue-400`     | `border-blue-200 dark:border-blue-800`     |
| **Complete** ✅ | `bg-green-50 dark:bg-green-950/20`   | `text-green-800 dark:text-green-400`   | `border-green-200 dark:border-green-800`   |
| **On Fire** 🔥  | `bg-red-50 dark:bg-red-950/20`       | `text-red-800 dark:text-red-400`       | `border-red-200 dark:border-red-800`       |
| **Selected**    | `bg-blue-50 dark:bg-blue-950/20`     | `text-foreground`                      | `border-blue-200 dark:border-blue-800`     |

### Implementation Example

```tsx
import { cn } from "@/lib/utils";

const StatusBadge = ({ type, children }) => {
  const styles = {
    starred:
      "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400",
    pinned: "bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400",
    complete:
      "bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-400",
    fire: "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400",
  };

  return (
    <span
      className={cn("px-2 py-1 rounded-md text-sm font-medium", styles[type])}
    >
      {children}
    </span>
  );
};
```

---

## 3. Typography Hierarchy

Avoid using arbitrary gray values for text. Use the system hierarchy to ensure readability in all themes.

### Text Levels

1.  **Primary Content** (`text-foreground`)

    - Headings
    - Body text
    - Input values
    - _Equivalent to: gray-900 (light) / gray-50 (dark)_

2.  **Secondary Content** (`text-muted-foreground`)

    - Metadata (dates, authors)
    - Helper text
    - Input placeholders
    - _Equivalent to: gray-500 (light) / gray-400 (dark)_

3.  **Interactive/Brand** (`text-primary`)
    - Links
    - Primary actions
    - Active states

### Headings Example

```tsx
// ❌ Bad
<h1 className="text-gray-900 font-bold">Title</h1>
<p className="text-gray-500">Subtitle</p>

// ✅ Good
<h1 className="text-foreground font-bold">Title</h1>
<p className="text-muted-foreground">Subtitle</p>
```

---

## 4. Components & Interactive Elements

### Buttons & Hover States

- **Ghost/Interactive Backgrounds**: Use `hover:bg-accent` and `hover:text-accent-foreground`.
  - _Do not use_: `hover:bg-gray-100` (looks bad in dark mode).
- **Active/Selected States**: Use `bg-accent` or `bg-secondary`.

### Borders & Dividers

- **Structural Borders**: Use `border-border`.
- **Input Borders**: Use `border-input`.
- **Separators**: Use `bg-border` (for 1px lines).

### Domain Colors (Pills)

For dynamic domain colors, ensure contrast ratios work in both modes.

- **Light Mode**: Background should be light (opacity ~10-20%), text dark.
- **Dark Mode**: Background should be dark (opacity ~20-30%), text light (often same color as dot, or white).

**Recommendation for `getDomainPillColors`**:

```typescript
// Conceptual implementation
function getDomainPillColors(color: string, isDarkMode: boolean) {
  if (isDarkMode) {
    return {
      background: `rgba(${color}, 0.2)`, // Darker, transparent bg
      foreground: `rgba(${color}, 1)`, // Bright text
      border: `rgba(${color}, 0.3)`,
    };
  }
  return {
    background: `rgba(${color}, 0.1)`, // Very light bg
    foreground: `darken(${color})`, // Darkened text for contrast
    border: `rgba(${color}, 0.2)`,
  };
}
```

---

## 5. Dark Mode Audit Checklist

Before merging any UI change, verify:

1.  [ ] **No `bg-white`**: Replaced with `bg-background` or `bg-card`.
2.  [ ] **No `text-gray-900`**: Replaced with `text-foreground`.
3.  [ ] **Status Colors Checked**: All colored backgrounds have `dark:` variants.
4.  [ ] **Borders Visible**: Borders use `border-border` and are visible in dark mode.
5.  [ ] **Hover States**: Hovering doesn't create a white flash or invisible text.
6.  [ ] **Inputs**: Input fields have visible borders and correct text contrast.

---

_Created: December 12, 2025_
