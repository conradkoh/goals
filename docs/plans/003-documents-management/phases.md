# Implementation Phases: Documents Management

## Phase Overview

| Phase | Description | Scope |
|-------|-------------|-------|
| Phase 1 | Database schema and backend API | Backend |
| Phase 2 | Document list page | Frontend |
| Phase 3 | Document editor page | Frontend |
| Phase 4 | Search and navigation integration | Full stack |

## Phase 1: Database Schema and Backend API

### Objective
Set up the database table and backend mutations/queries.

### Tasks

1. **Add documents table to schema**
   - Add `documents` table to `services/backend/convex/schema.ts`
   - Include indexes for efficient querying

2. **Create documents.ts backend file**
   - Implement `getDocuments` query
   - Implement `getDocument` query
   - Implement `createDocument` mutation
   - Implement `updateDocument` mutation
   - Implement `deleteDocument` mutation

3. **Add search query**
   - Implement `searchDocuments` query with title/content filtering

### Success Criteria
- [ ] Schema updated with documents table
- [ ] All CRUD operations working via Convex dashboard
- [ ] TypeScript types auto-generated

### Files Changed
- `services/backend/convex/schema.ts` (modified)
- `services/backend/convex/documents.ts` (new)

## Phase 2: Document List Page

### Objective
Create the documents list page where users can see all their documents.

### Tasks

1. **Create documents route**
   - Create `apps/webapp/src/app/app/documents/page.tsx`
   - Implement basic page structure

2. **Create DocumentCard component**
   - Display title, excerpt, last updated
   - Click navigates to document

3. **Create DocumentList component**
   - Fetch and display documents
   - Empty state for no documents
   - Loading state

4. **Add navigation link**
   - Add "Documents" to app navigation

### Success Criteria
- [ ] Documents page accessible at `/app/documents`
- [ ] Documents displayed in list/grid
- [ ] Navigation link visible
- [ ] Works in light and dark mode

### Files Changed
- `apps/webapp/src/app/app/documents/page.tsx` (new)
- `apps/webapp/src/components/atoms/DocumentCard.tsx` (new)
- `apps/webapp/src/components/molecules/documents/DocumentList.tsx` (new)
- Navigation component (modified)

## Phase 3: Document Editor Page

### Objective
Create the document view/edit page with rich text editing.

### Tasks

1. **Create document detail route**
   - Create `apps/webapp/src/app/app/documents/[documentId]/page.tsx`
   - Fetch document data

2. **Create DocumentEditor component**
   - Use existing RichTextEditor component
   - Add title editing
   - Implement save functionality (auto-save or button)

3. **Create new document flow**
   - Option A: Separate `/documents/new` page
   - Option B: Create blank document and redirect

4. **Add delete functionality**
   - Confirmation dialog
   - Redirect to list after delete

### Success Criteria
- [ ] Can view and edit existing documents
- [ ] Can create new documents
- [ ] Rich text editing works
- [ ] Changes are persisted
- [ ] Can delete documents

### Files Changed
- `apps/webapp/src/app/app/documents/[documentId]/page.tsx` (new)
- `apps/webapp/src/components/organisms/documents/DocumentEditor.tsx` (new)
- `apps/webapp/src/components/molecules/documents/DocumentHeader.tsx` (new)

## Phase 4: Search and Navigation Integration

### Objective
Add search functionality and integrate with CMD+K command palette.

### Tasks

1. **Add search to documents list**
   - Search input component
   - Debounced search query
   - Filter results in real-time

2. **Add to command palette**
   - Add "Documents" section to GoalSearchDialog
   - Allow searching documents from CMD+K

3. **Polish and accessibility**
   - Keyboard navigation
   - Screen reader support
   - Empty and error states

### Success Criteria
- [ ] Search filters documents by title/content
- [ ] Documents searchable via CMD+K
- [ ] Accessible and polished UI

### Files Changed
- `apps/webapp/src/components/molecules/documents/DocumentList.tsx` (modified)
- `apps/webapp/src/components/molecules/focus/GoalSearchDialog.tsx` (modified)

## Dependencies

- Phase 2 depends on Phase 1
- Phase 3 depends on Phase 1
- Phase 4 depends on Phases 2 and 3

## Notes

- Reuse existing `RichTextEditor` component for consistency
- Follow existing patterns for session-based queries
- Use optimistic updates where appropriate
