---
applyTo: "**"
---

# General Project Guidelines

This document provides general project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes across all parts of the project.

## Package Manager

We use **pnpm** as our package manager. This is a pnpm workspace with multiple packages.

### Main packages:

- `apps/webapp` - frontend project
- `services/backend` - backend project

The workspace is orchestrated with **Nx** (see `nx.json`).

## Code Quality & Linting

We use **Biome** for checking lints. This can be run from the root of the repo with `pnpm run lint`.

**Important:**

- ❌ AVOID running linting with the `next lint` command
- ❌ AVOID running linting with `eslint`

### Code Cleanup

The code can be improved by following the cleanup routine in [cleanup-improve-code-quality.md](../../guides/routines/cleanup-improve-code-quality.md)

## Testing

- Backend uses **Vitest** (see `services/backend/vitest.config.mts`). Prefer writing unit tests alongside Convex logic where practical.
- Frontend tests are not yet set up; if adding, prefer lightweight unit tests and avoid spinning up full Next.js unless necessary.

## Date Information

We might not always get the current date and time. The system knows best.

If you need information on the current date and time, run the command:

```bash
date +%Y-%m-%d\ %H:%M:%S
```

## Task Planning and Memory

### Important Rules

Always use [progress.html](../../progress.html) to plan tasks. This file contains detailed guidelines and tasks that help ensure cohesive system design when multiple people work on different tasks.

Key sections include:

1. **Changelog** - helps understand the context of previous changes to features being implemented
2. **Project Structure** - helps understand how and where to write files idiomatically
3. **Implementation Details** (file names, function names, interfaces) - planning these in advance helps avoid being overwhelmed with details while ensuring large-scale features work well together

### Core Directive

**Always use [progress.html](../../progress.html) to plan the tasks.**

<directive>
	<core>Always use <a href="../../progress.html">progress.html</a> to plan the tasks.</core>
	<why>Ensures consistent planning and shared context across contributors.</why>
	<scope>All tasks, across frontend and backend.</scope>
</directive>

### Critical Warnings

- ⚠️ **DO NOT RUN** the `pnpm run dev` command unless explicitly requested

### Verification Checklist

- [ ] Did you write your tasks inside [progress.html](../../progress.html)?
- [ ] Did you mark your current active task as "in-progress" in [progress.html](../../progress.html)?
- [ ] Did you update [progress.html](../../progress.html) after completing a task?

<verify>
	<check>Did you write your tasks inside <a href="../../progress.html">progress.html</a>?</check>
	<check>Did you mark your current active task as "in-progress" in <a href="../../progress.html">progress.html</a>?</check>
	<check>Did you update <a href="../../progress.html">progress.html</a> after completing a task?</check>
</verify>
