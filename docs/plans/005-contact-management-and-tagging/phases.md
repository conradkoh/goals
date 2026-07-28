# Implementation Phases: Contact Management and Tagging

## Phase Overview

| Phase   | Description                             | Scope           | Status          |
| ------- | --------------------------------------- | --------------- | --------------- |
| Phase 1 | Convex contacts domain and associations | Backend         | **Complete**    |
| Phase 2 | Contact management UI                   | Frontend        | **In progress** |
| Phase 3 | Goal contact tagging                    | Full stack (UI) | Pending         |
| Phase 4 | Goal log contact tagging                | Full stack (UI) | Pending         |
| Phase 5 | Quarterly review contact lookup         | Frontend        | Pending         |
| Phase 6 | Markdown contact mentions               | Frontend        | Pending         |
| Phase 7 | Integration verification and polish     | Full stack      | Pending         |

Implementation order is dependency-driven: backend contracts first, then management UI, then goal/log/review/markdown integrations, then final verification.

---

## Phase 1: Convex Contacts Domain and Associations

### Objective

Establish ownership-safe contacts CRUD/search and normalized many-to-many links between contacts, goals, and goal logs.

### Deliverables

1. **Schema tables** in `services/backend/convex/schema.ts`
   - `contacts` — per-user contact records (name required; email, organization, notes optional)
   - `goalContacts` — join table linking goals to contacts
   - `goalLogContacts` — join table linking goal logs to contacts
   - Composite indexes for user-scoped lookups; no embedded `contactIds` arrays on goals or goalLogs

2. **API module** `services/backend/convex/contact.ts`
   - `createContact`, `updateContact`, `deleteContact`
   - `getContacts` (search + alphabetical sort), `getContact`
   - `setGoalContacts`, `getGoalContacts`
   - `setGoalLogContacts`, `getGoalLogContacts`
   - `getContactWork` — returns linked goals and logs for review workflows

3. **TDD test suite** `services/backend/convex/contact.spec.ts` (11 cases)
   - CRUD trimming/validation, case-insensitive search, cross-user isolation
   - Idempotent deduplicated association replacement
   - `RESOURCE_IN_USE` deletion guard when linked to goals or logs

### Success Criteria

- [x] All 11 contact backend tests pass
- [x] Backend typecheck passes
- [x] Committed as `f73e74ad` — `feat(contacts): add Convex contacts domain and goal/log association APIs`

### Files

- `services/backend/convex/schema.ts` (modified)
- `services/backend/convex/contact.ts` (new)
- `services/backend/convex/contact.spec.ts` (new)
- `services/backend/convex/_generated/api.d.ts` (regenerated)

---

## Phase 2: Contact Management UI

### Objective

Users can search, create, inspect, edit, and delete contacts from `/app/contacts`, reachable from the authenticated user menu.

### Deliverables

1. **Form helpers** `apps/webapp/src/lib/contact/contact-form.ts` + tests
   - `ContactFormValues`, `ContactInput`, `normalizeContactForm`, `contactToFormValues`

2. **Data hook** `apps/webapp/src/hooks/useContacts.tsx`
   - Wraps `api.contact` query and CRUD mutations
   - Preserves distinct loading state (does not coerce `undefined` to `[]`)

3. **UI components**
   - `ContactCard.tsx` — accessible button-styled row
   - `ContactFormDialog.tsx` — create/edit with nested delete confirmation + tests

4. **Management page** `apps/webapp/src/app/app/contacts/page.tsx`
   - Search, loading, empty (first-use and filtered), create/edit/delete flows
   - Toast feedback on successful mutations

5. **Navigation** `apps/webapp/src/components/UserMenu.tsx`
   - Contacts link between Profile and Documentation

### UX Contracts

- Name required; email, organization, notes optional
- Search uses backend `getContacts({ search })` semantics
- Deleting a linked contact shows actionable `RESOURCE_IN_USE` error without silently closing dialogs
- Keyboard-friendly: Cmd/Ctrl+Enter submit via `useFormSubmitShortcut`

### Success Criteria

- [x] TDD helper and dialog tests authored
- [x] `/app/contacts` page and components implemented
- [x] UserMenu navigation wired
- [ ] Full webapp test suite and typecheck verified at PR completion time
- [x] Committed as `272445e6` — `feat(contacts): add contact management UI and implementation plan`

### Files

- `apps/webapp/src/lib/contact/contact-form.ts` (new)
- `apps/webapp/src/lib/contact/contact-form.test.ts` (new)
- `apps/webapp/src/hooks/useContacts.tsx` (new)
- `apps/webapp/src/components/molecules/contacts/ContactCard.tsx` (new)
- `apps/webapp/src/components/molecules/contacts/ContactFormDialog.tsx` (new)
- `apps/webapp/src/components/molecules/contacts/ContactFormDialog.test.tsx` (new)
- `apps/webapp/src/app/app/contacts/page.tsx` (new)
- `apps/webapp/src/components/UserMenu.tsx` (modified)

---

## Phase 3: Goal Contact Tagging

### Objective

Users can tag one or more contacts on a goal from goal details / edit surfaces.

### Deliverables

1. **Reusable selector component** (mirror `GoalInitiativeField` / `InitiativeSelector` patterns)
   - Multi-select contact picker with search
   - Shows currently linked contacts as removable chips/badges

2. **Integration points**
   - Goal details modal / edit flows (adhoc, weekly, quarterly as applicable)
   - Calls `setGoalContacts` on save; reads via `getGoalContacts`

3. **Component tests** for selector behavior (search, select, deselect, empty state)

### Success Criteria

- [ ] User can add/remove contacts on a goal from goal details
- [ ] Associations persist and reload correctly
- [ ] Cross-user contacts cannot be selected
- [ ] Tests cover selector interactions

### Files (planned)

- `apps/webapp/src/components/molecules/contacts/ContactSelector.tsx` (new)
- `apps/webapp/src/components/molecules/contacts/GoalContactField.tsx` (new)
- Goal details popover / modal integration files (modified)

---

## Phase 4: Goal Log Contact Tagging

### Objective

Users can tag contacts on individual goal logs, using the same selector patterns as goals.

### Deliverables

1. **Log contact field** integrated into goal log create/edit forms
   - Calls `setGoalLogContacts` / `getGoalLogContacts`

2. **Consistent UX** with Phase 3 selector (shared `ContactSelector` component)

3. **Tests** for log form integration

### Success Criteria

- [ ] User can tag contacts when creating or editing a goal log
- [ ] Log contact associations persist and display on reload
- [ ] Deletion guards on contacts still work when logs are linked

### Files (planned)

- Goal log form components (modified)
- Reuse `ContactSelector` from Phase 3

---

## Phase 5: Quarterly Review Contact Lookup

### Objective

When generating or viewing quarterly reviews, surface contacts linked to relevant goals and logs so the user can work with the people involved.

### Deliverables

1. **Review data integration**
   - Use `getContactWork` and/or batch `getGoalContacts` / `getGoalLogContacts` for goals/logs in review scope
   - Present associated contacts in quarterly summary / pull-preview flows

2. **Filtering**
   - Allow narrowing review content by contact where appropriate

3. **Tests** for contact aggregation in review contexts

### Success Criteria

- [ ] Quarterly review flows show contacts linked to in-scope goals/logs
- [ ] Contact lookup is centralized through `api.contact` (no duplicated relation queries)
- [ ] Empty/no-contact cases handled gracefully

### Files (planned)

- `apps/webapp/src/app/app/goal/quarterly-summary/page.tsx` (modified)
- Quarterly pull-preview components (modified)
- Supporting hooks/utilities as needed

---

## Phase 6: Markdown Contact Mentions

### Objective

Users can tag contact names in markdown/rich-text content with autocomplete search matching existing contacts.

### Deliverables

1. **Mention trigger** in rich text editor (e.g. `@` or existing mention pattern)
2. **Autocomplete popover** querying `getContacts({ search })` with debounced input
3. **Rendered mention** — stored representation that resolves to contact identity
4. **Tests** for mention insertion and search matching

### Success Criteria

- [ ] Typing a contact trigger shows searchable contact suggestions
- [ ] Selecting a contact inserts a mention tied to the contact record
- [ ] Search is case-insensitive and matches name/email/organization (same as management search)

### Files (planned)

- Rich text editor mention extension (modified or new)
- `apps/webapp/src/components/molecules/contacts/ContactMentionList.tsx` (new, planned)

---

## Phase 7: Integration Verification and Polish

### Objective

End-to-end verification, stale-link cleanup if needed, and PR readiness.

### Deliverables

1. **Full test pass** — backend + webapp typecheck and test suites
2. **Stale-link cleanup** — ensure goal/log deletion removes orphaned join rows (if not already handled)
3. **Accessibility and responsive pass** on all new surfaces
4. **Mark PR ready for review** (when feature is complete)

### Success Criteria

- [ ] All project tests pass
- [ ] No orphaned `goalContacts` / `goalLogContacts` rows after entity deletion
- [ ] Draft PR converted to ready-for-review when all phases complete

---

## Shared Architecture Decisions

| Decision           | Choice                                   | Rationale                                               |
| ------------------ | ---------------------------------------- | ------------------------------------------------------- |
| Relationship model | Normalized join tables                   | Many-to-many; avoids array drift on goals/logs          |
| Ownership          | Per-user private contacts                | Matches existing user-scoped data patterns              |
| Search             | Backend `getContacts` everywhere         | Single matching semantics across UI and mentions        |
| Management UX      | List + dialog (no detail route)          | Compact surface; matches initiatives/documents patterns |
| Deletion           | Hard delete with `RESOURCE_IN_USE` guard | Prevents orphan relations; forces explicit untagging    |
| Testing            | TDD per slice                            | Backend 11 tests done; frontend tests per phase         |

## Resume Checklist

When returning to this feature:

1. Verify Phase 2 tests and typecheck; commit if not already done
2. Implement Phase 3 (goal tagging) — highest user-visible value after management UI
3. Phase 4 (log tagging) — reuses Phase 3 selector
4. Phases 5–6 in parallel only after 3–4 stabilize
5. Phase 7 before marking PR ready
