# Project Rules

This document compiles all the development rules and guidelines for the Goals Tracking Application project.

## Commands to Avoid

**CRITICAL:** You must ABSOLUTELY NOT run any of the following commands, or commands that are of a similar format unless the user explicitly says so:

- `npm run dev`
- `npm run build` 
- `npx convex run ...`
- `pnpm run dev` (DO NOT RUN)

## Authentication & Backend (Convex)

When creating queries/mutations/actions on the backend:

1. **Session Management**: Assume the sessionId is passed in as a parameter to the function
2. **User Lookup**: Always do a lookup against the session table to get the user id, rather than using in-built convex functions

## Package Management

1. **Package Manager**: We use `pnpm` for this project
2. **TypeScript Support**: Ensure to install `@types/...` for packages that need it, as we use TypeScript
3. **Monorepo Structure**: This is a monorepo, ensure that you install packages in the right workspace:
   - `@apps/webapp`
   - `@services/backend`

## UI Components (Shadcn)

- **CLI Tool**: Remember that the `shadcn-ui` cli has been replaced by `shadcn`

## Task Planning and Memory

### Core Directive
**Always use `progress.html` to plan tasks.**

### Overview
`progress.html` contains many important detailed guidelines and tasks that should be used to plan for tasks. There are key parts that help ensure cohesive system design when multiple people work on different tasks:

1. **Changelog** - helps understand the context of previous changes to features being implemented
2. **Project Structure** - helps understand how and where to write files in an idiomatic fashion
3. **Implementation Details** (file names, function names, interfaces) - planning these in advance helps avoid being overwhelmed with details while ensuring different large-scale features work well together

### Verification Checklist

Before completing any task, verify:

- [ ] Did you write your tasks inside `progress.html`?
- [ ] Did you mark your current active task as "in-progress" in `progress.html`?
- [ ] Did you update `progress.html` after you completed a task?

### Warnings

⚠️ **DANGER**: DO NOT RUN the `pnpm run dev` command

---

*This document is compiled from rules in `/Users/conradkoh/Documents/Repos/goals/.cursor/rules/`*