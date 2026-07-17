# Goals Webapp

Next.js frontend for the Goals application. See the [root README](../../README.md) for setup, deployment, and project overview.

## Development

From the repo root:

```bash
pnpm dev
```

Or from this directory (requires `apps/webapp/.env.local` with `NEXT_PUBLIC_CONVEX_URL`):

```bash
pnpm dev
pnpm build
pnpm test
```

The app runs at http://localhost:3000.
