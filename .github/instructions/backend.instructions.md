---
applyTo: "**"
---

# Backend Development Guidelines

This document provides backend-specific context and coding guidelines for the Convex backend located in `services/backend`.

## Authentication Conventions

### Backend Authentication

All authenticated Convex queries and mutations must:

1) Accept a `sessionId` argument typed as `v.id('sessions')`
2) Call `requireLogin(ctx, sessionId)` to resolve and validate the user

Example (matches this repo’s pattern):

```ts
import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { requireLogin } from '../src/usecase/requireLogin';

export const myQuery = query({
  args: {
    sessionId: v.id('sessions'),
    // other args
  },
  handler: async (ctx, { sessionId /*, ...rest */ }) => {
    const user = await requireLogin(ctx, sessionId);
    // Implementation using user._id
  },
});

export const myMutation = mutation({
  args: {
    sessionId: v.id('sessions'),
    // other args
  },
  handler: async (ctx, { sessionId /*, ...rest */ }) => {
    const user = await requireLogin(ctx, sessionId);
    // Implementation using user._id
  },
});
```

<directive>
  <core>Require a sessionId: v.id('sessions') arg and enforce via requireLogin(ctx, sessionId).</core>
  <why>Ensures consistent auth and prevents unauthenticated access.</why>
  <scope>Convex queries and mutations.</scope>
</directive>

### Auth Provider

The frontend manages sessions via a custom `SessionProvider` and passes `sessionId` to Convex calls. The Convex client is provided by `ConvexClientProvider`.

<note>
  <context>Frontend provides session via SessionProvider; backend expects a sessionId arg and uses requireLogin.</context>
</note>

## Feature Flags

There are currently no feature flags defined in this repository.

If you introduce feature flags, prefer a typed configuration module and safe defaults (off/false). Suggested locations:

- `services/backend/src/config/featureFlags.ts` (create if needed), or
- colocate simple toggles in `services/backend/src/constants.ts` if very limited in scope.

<verify>
  <check>New flags default to safe values (off/false).</check>
  <check>Reads are centralized and typed.</check>
  <check>There’s a migration/fallback path when removing a flag.</check>
</verify>
