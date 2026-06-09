# Development Guidelines

A quick reference for working with the Next.js + Convex monorepo.

---

## Architecture

- **apps/webapp** — Next.js frontend application
  - `src/application/` — App-specific frontend code (see [README](apps/webapp/src/application/README.md))
- **services/backend** — Convex backend
  - `application/` — App-specific backend code (see [README](services/backend/application/README.md))
- **docs** — Project documentation
  - `application/` — App-specific documentation (see [README](docs/application/README.md))

---

## Frontend (apps/webapp)

### Theming & Dark Mode

Use semantic, theme-aware colors — never hard-coded light-only values.

See **[docs/design/design-guidelines.md](docs/design/design-guidelines.md)** — the source of truth for color tokens, dark-mode variants, and testing guidance.

### UI Components & Icons

- **Components**: ShadCN UI
- **Icons**: @radix-ui/react-icons, lucide-react, react-icons

**Add a new ShadCN component:**

```bash
cd apps/webapp && npx shadcn@latest add <component-name>
```

### Next.js App Router

The `params` prop is a Promise — must await it:

```tsx
export default async function MyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div>{id}</div>;
}
```

### Authentication (Frontend)

Use session-aware hooks from convex-helpers:

```tsx
import { useSessionQuery, useSessionMutation } from 'convex-helpers/react/sessions';

const data = useSessionQuery(api.my.query);
const mutate = useSessionMutation(api.my.mutation);
```

---

## Backend (services/backend)

### Authentication

All authenticated Convex functions require `SessionIdArg`:

```ts
import { SessionIdArg } from 'convex-helpers/server/sessions';

export const myQuery = query({
  args: { ...SessionIdArg /* other args */ },
  handler: async (ctx, args) => {
    // Authenticated
  },
});
```

### Feature Flags

Configured in `services/backend/config/featureFlags.ts`.

When adding flags:

- Use safe defaults (off/false)
- Keep reads centralized and typed
- Plan migration path for removal

---

## Core Principles

### Code Approach

**Size of changes**: For complex work, prefer incremental changes or create new code and migrate. Large migrations need a plan — verify as you go.

**Performance**: Use indexes for large volume lookups or ordered columns. In Convex, computations run in the DB — n+1 queries are often fine.

**Naming**: Function names should match their actions. Mutations: `create`, `write`, `update`. Queries: `get`, `list`, `fetch`. No mutations in "get" methods.

### DAFT Abstraction Principles

- **Dimensionality**: High-dimension problems (UI layer) can't be solved by abstraction alone
- **Atomicity**: One responsibility per abstraction
- **Friction**: Good defaults with few props beat many mandatory props
- **Testing**: Simple functions are easier to test than complex classes

---

## Common Tasks

### Running the Project

```bash
# Start dev server
pnpm dev

# Run initial setup
pnpm setup
```

### Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch
```

### Type Checking & Linting

```bash
# Type check both apps
pnpm typecheck

# Lint with fixes
pnpm lint:fix

# Format code
pnpm format:fix
```

### Turbo Commands

```bash
# Run a target on specific project
turbo run dev --filter=webapp
turbo run typecheck --filter=backend

# Run many targets
turbo run test --filter=webapp --filter=backend
```

---

## Project Structure

```
next-convex-starter-app/
├── apps/webapp/           # Next.js frontend
│   └── src/application/   # App-specific frontend code
├── services/backend/      # Convex backend
│   └── application/       # App-specific backend code
├── docs/                  # Documentation
│   └── application/       # App-specific documentation
└── scripts/               # Utility scripts
```
