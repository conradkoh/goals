# Implementation Phases: Scratchpad History UX Overhaul

## Phase Overview

| Phase   | Description                                              | Scope      |
| ------- | -------------------------------------------------------- | ---------- |
| Phase 1 | Backend: delete archived scratchpad mutation             | Backend    |
| Phase 2 | Extract ScratchpadHistoryDialog component + flat list UI | Frontend   |
| Phase 3 | Responsive master-detail layout with content view        | Frontend   |
| Phase 4 | Transitions and animations                               | Frontend   |
| Phase 5 | Copy to clipboard as markdown                            | Frontend   |
| Phase 6 | Delete history item with confirmation                    | Frontend   |
| Phase 7 | Cleanup and polish                                       | Full stack |

## Phase 1: Backend — Delete Archived Scratchpad Mutation

### Objective

Add a backend mutation to delete a single archived scratchpad by ID.

### Tasks

1. **Add `deleteArchivedScratchpad` mutation to `services/backend/convex/scratchpad.ts`**
   - Accept `archiveId: v.id('scratchpadArchive')` argument
   - Validate user owns the archive entry before deleting
   - Return `{ success: true }` on deletion

### Acceptance Criteria

- [ ] Mutation added and typechecks
- [ ] Only the owning user can delete their own archive entries

### Files Changed

- `services/backend/convex/scratchpad.ts` (modified)

---

## Phase 2: Extract ScratchpadHistoryDialog + Flat List UI

### Objective

Extract the history dialog into its own component and convert the current full-content rendering to a flat list with 2-line previews.

### Tasks

1. **Extract `ScratchpadHistoryDialog` component**
   - Move from `FocusModeFocusedView.tsx` into a new file: `apps/webapp/src/components/organisms/focus/ScratchpadHistoryDialog.tsx`
   - Props: `open: boolean`, `onOpenChange: (open: boolean) => void`
   - The component manages its own data fetching (the `useSessionQuery` for `listArchivedScratchpads`)

2. **Convert to flat list with 2-line preview**
   - Each item shows: timestamp (relative, e.g. "Today, 3:15 PM") and first 2 lines of plain text extracted from HTML content
   - Remove the current grouped-by-day full-content rendering
   - Use `line-clamp-2` (Tailwind) for text truncation
   - Items should be visually clickable (hover state, cursor pointer)
   - Keep the date group headings (Today, Yesterday, date)

3. **Wire up in FocusModeFocusedView**
   - Replace inline dialog JSX with `<ScratchpadHistoryDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen} />`
   - Remove the `archivedScratchpads` query and helper functions from FocusModeFocusedView (move them into the new component)

### Acceptance Criteria

- [ ] History dialog extracted into standalone component
- [ ] Items show 2-line preview instead of full content
- [ ] Clicking an item doesn't do anything yet (handled in Phase 3)
- [ ] `groupArchivesByDay` and `formatArchiveTime` helpers moved to the new component
- [ ] `pnpm typecheck` passes

### Files Changed

- `apps/webapp/src/components/organisms/focus/ScratchpadHistoryDialog.tsx` (new)
- `apps/webapp/src/components/organisms/focus/FocusModeFocusedView.tsx` (modified — simplified)

---

## Phase 3: Responsive Master-Detail Layout with Content View

### Objective

Implement the master-detail layout: desktop shows list and content side-by-side; mobile shows list or content with back navigation.

### Tasks

1. **Desktop layout (md+ breakpoint)**
   - Dialog content width: `max-w-4xl` (wider than current)
   - Left panel (list): ~300px fixed width, scrollable, with border-right
   - Right panel (content): flex-1, shows full content of selected item with `SafeHTML`
   - Clicking a list item highlights it and shows content in right panel
   - Empty state in right panel when nothing selected: "Select an item to view its content"

2. **Mobile layout (below md breakpoint)**
   - Default: show the list (full width)
   - On item click: slide to content view (full width)
   - Back button at top of content view to return to list
   - Back button should be a simple `← Back` text button or `ChevronLeft` icon

3. **Selected item state**
   - Track `selectedArchiveId` state in the dialog component
   - Derive selected item from the archives list
   - Clear selection when dialog closes (via `onOpenChange`)

4. **Content view**
   - Show timestamp at top (formatted date + time)
   - Full rendered content via `SafeHTML`
   - Action buttons (copy, delete) — render as placeholder/empty area for now (implemented in Phases 5 & 6)

### Acceptance Criteria

- [ ] Desktop: side-by-side list + content
- [ ] Mobile: list → content drill-down with back button
- [ ] Selected item highlighted in list
- [ ] Full content renders correctly in detail panel
- [ ] `pnpm typecheck` passes

### Files Changed

- `apps/webapp/src/components/organisms/focus/ScratchpadHistoryDialog.tsx` (modified)

---

## Phase 4: Transitions and Animations

### Objective

Add smooth transitions for the mobile list↔content view switch and subtle hover/selection animations.

### Tasks

1. **Mobile view transition**
   - Use CSS `transition` or `framer-motion` (if already available) for the list↔content switch
   - Simple slide-left / slide-right transition when switching views
   - If no animation library available, use CSS transitions with `transform: translateX()` and `transition: transform 200ms ease`

2. **List item hover/active states**
   - Subtle `bg-accent/50` on hover
   - Selected item: `bg-accent` background with left border accent
   - Smooth background transition: `transition-colors duration-150`

3. **Content panel fade-in**
   - When selecting a different item on desktop, fade in the new content
   - Use `opacity` + `transition` or a simple `animate-in` class

### Acceptance Criteria

- [ ] Mobile: smooth slide transition between list and content
- [ ] Hover and selection states feel responsive
- [ ] Content changes on desktop feel smooth (no jarring jumps)
- [ ] `pnpm typecheck` passes

### Files Changed

- `apps/webapp/src/components/organisms/focus/ScratchpadHistoryDialog.tsx` (modified)

---

## Phase 5: Copy to Clipboard as Markdown

### Objective

Allow users to copy an archived scratchpad's content to clipboard as markdown.

### Tasks

1. **HTML to Markdown conversion**
   - Add a utility function `htmlToMarkdown(html: string): string`
   - Place in `apps/webapp/src/lib/html-to-markdown.ts`
   - Handle: headings, bold, italic, links, lists (ordered/unordered), task lists, blockquotes, code blocks, paragraphs
   - Use a lightweight approach (DOM parsing + recursive walk), or install `turndown` if preferred

2. **Copy button in content view**
   - Add a "Copy" button (with clipboard icon) in the content view header/toolbar
   - On click: convert HTML to markdown, copy to clipboard via `navigator.clipboard.writeText()`
   - Show brief feedback: button text changes to "Copied!" for 2 seconds (or use a toast)

3. **Dark mode compatible styling**
   - Button uses `variant="outline"` or `variant="ghost"` from ShadCN

### Acceptance Criteria

- [ ] Copy button visible in content detail view
- [ ] Clicking copies content as clean markdown
- [ ] Visual feedback on copy
- [ ] Works in both light and dark mode
- [ ] `pnpm typecheck` passes

### Files Changed

- `apps/webapp/src/lib/html-to-markdown.ts` (new)
- `apps/webapp/src/components/organisms/focus/ScratchpadHistoryDialog.tsx` (modified)

---

## Phase 6: Delete History Item with Confirmation

### Objective

Allow users to delete individual archived scratchpads with a confirmation dialog.

### Tasks

1. **Delete button in content view**
   - Add a "Delete" button (with trash icon) in the content view header/toolbar alongside copy
   - Use `variant="ghost"` with destructive styling: `text-destructive hover:bg-destructive/10`

2. **Confirmation dialog**
   - Use ShadCN `AlertDialog` (already in project)
   - Title: "Delete Archived Item"
   - Description: "This will permanently delete this archived scratchpad. This action cannot be undone."
   - Cancel + Delete (destructive) buttons

3. **Delete mutation call**
   - Call `deleteArchivedScratchpad` mutation from Phase 1
   - After successful deletion:
     - Clear selection (go back to list on mobile)
     - The item disappears from the list automatically (Convex reactivity)

### Acceptance Criteria

- [ ] Delete button visible in content detail view
- [ ] Confirmation dialog shown before deletion
- [ ] Item removed from list after deletion
- [ ] On mobile, returns to list view after deletion
- [ ] `pnpm typecheck` passes

### Files Changed

- `apps/webapp/src/components/organisms/focus/ScratchpadHistoryDialog.tsx` (modified)

---

## Phase 7: Cleanup and Polish

### Objective

Final cleanup, remove any scaffolding, ensure code quality.

### Tasks

1. **Code review cleanup**
   - Remove unused imports from `FocusModeFocusedView.tsx` (e.g. `ScrollArea` if no longer used there, `SafeHTML` if moved)
   - Ensure no console.log statements left behind

2. **Edge cases**
   - Empty content archives display gracefully
   - Dialog height doesn't overflow on small screens
   - Keyboard navigation (Escape closes dialog)
   - Selection clears when dialog reopens

3. **Typecheck and lint**
   - `pnpm typecheck` passes
   - `pnpm lint:fix` passes

### Acceptance Criteria

- [ ] No unused imports or dead code
- [ ] All edge cases handled
- [ ] Clean typecheck and lint

### Files Changed

- Various files from previous phases (cleanup only)

---

## Dependencies

- Phase 2 depends on Phase 1 (needs the delete mutation signature even if not used yet)
- Phase 3 depends on Phase 2
- Phase 4 depends on Phase 3
- Phase 5 depends on Phase 3
- Phase 6 depends on Phases 1 and 3
- Phase 7 depends on all previous phases

## Notes

- Reuse existing `SafeHTML` component for rendering archived content
- Follow existing V2 Industrial Design System patterns (uppercase headings, tracking-wider, 2px borders)
- All colors must use semantic tokens for dark mode compatibility
- Each phase results in a working, committable state — no broken intermediate steps
