# Goals

A goal-tracking application for managing objectives across quarterly, weekly, and daily time horizons. Built as a Next.js + Convex monorepo.

## Features

- **Hierarchical goal management** — Quarterly goals break down into weekly targets and daily tasks
- **Focus view** — A streamlined daily workspace with urgent items, pinned quarterly goals, initiatives, and adhoc goals
- **Initiatives** — Date-bounded efforts that group goals across multiple quarters
- **Dashboard views** — Quarterly, weekly, and focused perspectives on your goal hierarchy
- **Scratchpad** — Quick capture with history for transient notes
- **Quarterly summaries** — Select goals or initiatives and export context for reporting or AI agents
- **Real-time sync** — Powered by Convex reactive queries

## Tech Stack

- **Frontend:** Next.js (App Router), React, ShadCN UI, Tailwind CSS
- **Backend:** Convex
- **Monorepo:** pnpm workspaces, Turbo

## Getting Started

### Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io/)
- [Convex](https://www.convex.dev/) account

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Initialize the project (Convex backend + webapp environment):

   ```bash
   pnpm run setup
   ```

   This initializes the Convex backend in `services/backend` and writes `NEXT_PUBLIC_CONVEX_URL` to `apps/webapp/.env.local`.

3. Start development servers:

   ```bash
   pnpm dev
   ```

   - Webapp: http://localhost:3000
   - Convex dev server runs alongside

#### Manual Setup

If you prefer to configure manually:

1. In `services/backend`, run `npx convex dev --once` to create a Convex project and `.env.local`.
2. Create `apps/webapp/.env.local` with:

   ```sh
   NEXT_PUBLIC_CONVEX_URL=<your-convex-project-url>
   ```

   Copy the URL from `services/backend/.env.local`.

3. Run `pnpm dev` from the repo root.

## System Administration

To grant system admin access:

1. Sign in anonymously via the login page.
2. In the [Convex Dashboard](https://dashboard.convex.dev), open Data → `users` and set `accessLevel` to `"system_admin"` for your user.
3. Access **System Admin** from your username menu to configure auth providers and settings.

### Google OAuth

1. As a system admin, go to **System Admin** → **Google Auth Config** and follow the setup instructions.
2. After signing in with Google, transfer `system_admin` to your Google user in the Convex `users` table and remove it from the anonymous account.

## Development

```bash
pnpm dev          # Start webapp + Convex
pnpm test         # Run all tests
pnpm test:watch   # Watch mode
pnpm typecheck    # TypeScript checks
pnpm lint         # ESLint
```

See [AGENTS.md](AGENTS.md) for architecture, conventions, and coding standards.

### Project Structure

- `apps/webapp/` — Next.js frontend
- `services/backend/` — Convex backend
- `docs/` — Application and developer documentation
- `guides/` — Testing and other guides

### Testing

Run all tests with `pnpm test`. For conventions and examples, see the [Testing Guide](guides/testing/testing.md).

## Deployment

### Convex Backend

1. Generate a production deploy key in the [Convex Dashboard](https://dashboard.convex.dev) (Project Settings → Generate Production Deploy Key).
2. Add it to GitHub Secrets as `CONVEX_DEPLOY_KEY_PROD`.
3. Pushes to `master` deploy via [.github/workflows/deploy-prod.yml](.github/workflows/deploy-prod.yml).

### Vercel (Frontend)

1. Copy your Convex deployment URL from the Convex dashboard (Settings → URL & Deploy Key).
2. In Vercel project settings:
   - **Root Directory:** `apps/webapp`
   - **Environment variable:** `NEXT_PUBLIC_CONVEX_URL` = your Convex deployment URL (include Production and Preview scopes)
3. Deploy as usual.

## Documentation

- [Product overview (PRD)](docs/prd.md)
- [Development guidelines](AGENTS.md)
- [Application docs](docs/application/README.md)
- [Design guidelines](docs/design/design-guidelines.md)
