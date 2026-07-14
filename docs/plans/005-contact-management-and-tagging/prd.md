# PRD: Contact Management and Tagging

## Problem

Users track goals and progress involving specific people, but the app has no first-class way to record who is involved, link people to goals/logs, or find related work when preparing reviews or writing notes.

## Solution

Add a contacts feature with:

- A private per-user contact list (name + optional email, organization, notes)
- Many-to-many tagging on goals and goal logs
- Contact lookup in quarterly review workflows
- Searchable contact mentions in markdown content
- A dedicated `/app/contacts` management page

## Requirements

### Must Have

- CRUD + search for contacts (backend + management UI)
- Tag goals to contacts; tag goal logs to contacts
- Look up contacts when generating reviews
- Tag contact names in markdown with matching search
- Dedicated contact management area
- TDD for backend and frontend slices
- User-scoped data with ownership validation

### Should Have

- Consistent UX with initiatives/documents patterns
- Actionable errors when deleting in-use contacts
- Keyboard shortcuts in forms (Cmd/Ctrl+Enter)

### Won't Have (this iteration)

- Team/shared contacts
- Phone numbers, avatars, aliases
- Pagination
- Contact merge/dedupe

## Acceptance Criteria (full feature)

1. User can create, edit, delete, and search contacts at `/app/contacts`
2. User can tag one or more contacts on a goal from goal details
3. User can tag contacts on goal logs
4. Quarterly review flows surface contacts linked to in-scope work
5. Markdown editor supports contact mention autocomplete
6. All new tests pass; typecheck clean

## Implementation Plan

See [phases.md](./phases.md) for slice-by-slice breakdown and current status.
