---
applyTo: "**"
---

# Frontend Development Guidelines

This document provides frontend-specific context and coding guidelines for the webapp located in `apps/webapp`.

## IMPORTANT DEVELOPMENT RULES

- ❌ **NEVER run the `dev` command** to start the dev server unless explicitly told to do so
- ❌ **NEVER run the `build` command** to test the app - prefer running tests and typechecks instead

<warnings>
  <danger>Do not run `pnpm run dev` unless explicitly requested.</danger>
  <advice>Prefer tests and typechecks over manual builds for validation.</advice>
</warnings>

## Dark Mode Guidelines - CRITICAL FOR ALL COMPONENTS

### **Golden Rule: Use Semantic Colors First**

✅ **Preferred approach** - these automatically adapt:

- Text: `text-foreground`, `text-muted-foreground`
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`, `bg-accent`
- Interactive: `hover:bg-accent/50`
- Borders: `border-border`, `border-input`

❌ **Avoid these** - they break in dark mode:

- `text-black`, `bg-white`, `text-gray-900`, `bg-gray-50`

### **When You Need Brand/Status Colors**

✅ **Always include dark variants**:

```tsx
// Status backgrounds
bg-red-50 dark:bg-red-950/20
bg-green-50 dark:bg-green-950/20

// Status text
text-red-600 dark:text-red-400
text-green-600 dark:text-green-400

// Borders
border-red-200 dark:border-red-800
```

❌ **Never use single-mode colors**:

```tsx
bg-red-50; // Will cause white text on light red in dark mode
```

### **Quick Reference**

| Purpose         | Use This                | Not This           |
| --------------- | ----------------------- | ------------------ |
| Primary text    | `text-foreground`       | `text-black`       |
| Secondary text  | `text-muted-foreground` | `text-gray-600`    |
| Card background | `bg-card`               | `bg-white`         |
| Hover states    | `hover:bg-accent/50`    | `hover:bg-gray-50` |

### **Testing Checklist**

Test each component in: light mode → dark mode → system mode

## UI Design - Components & Icons

This project uses the following libraries:

- **Components**: ShadCN
- **Icons**:
  - @radix-ui/react-icons
  - lucide-react
  - react-icons

### ShadCN Components

- When adding a new component, use the command format `npx shadcn@latest add <component-name>`
- ⚠️ **ALWAYS run the shadcn component add command from within the webapp folder** at `apps/webapp`

<note>
  <scope>UI components</scope>
  <why>Running the generator from the correct folder ensures paths and aliases resolve properly.</why>
</note>

## Next.js App Router

In the latest Next.js app router, the `params` prop for top-level pages is now passed in as a **Promise**. This means you must `await` the params before using them in your page components.

### Example

```tsx
// Always destructure and use `await params` in your top-level page components.
export default async function MyComponent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <div>{id}</div>;
}
```

## Authentication (Frontend)

This app uses a custom session context, not convex-helpers’ session hooks.

- Session is established with `SessionProvider` (`apps/webapp/src/modules/auth/SessionContext.tsx`).
- Access the current session via `useSession()` which returns `{ sessionId }`.
- Call Convex using `useQuery` / `useMutation` from `convex/react`, passing `sessionId` explicitly in args.

### Example

```tsx
import { useQuery, useMutation } from 'convex/react';
import { api } from '@services/backend/convex/_generated/api';
import { useSession } from '@/modules/auth/useSession';

export function MyComponent() {
  const { sessionId } = useSession();
  const data = useQuery(api.dashboard.getQuarterOverview, {
    sessionId,
    year: 2025,
    quarter: 3,
  });
  const createGoal = useMutation(api.dashboard.createQuarterlyGoal);

  const onCreate = async () => {
    await createGoal({ sessionId, year: 2025, quarter: 3, title: 'New goal', weekNumber: 32 });
  };

  // ...render UI with `data`
}
```

## Feature Flags

There are currently no frontend feature flags wired from the backend. If added in the future, prefer deriving them from a typed backend source (e.g., a `getFeatureFlags` query) and threading them via React context.
