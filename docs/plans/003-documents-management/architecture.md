# Architecture: Documents Management

## Overview

This feature adds a new "Documents" module to the application with a database table, backend mutations/queries, and frontend components.

## Design Decisions (Finalized in Discussion)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage Format | HTML | Matches RichTextEditor (Tiptap) output |
| Auto-save | Debounced + inline status | Less disruptive than toasts |
| New Document | "Untitled Document" default | Lower friction |
| Delete | Toast with undo | Quick action with safety net |
| Navigation | CMD+K primary, Action Menu secondary | Fits minimal navigation pattern |
| Document Structure | Flat (no folders) | MVP simplicity |

## Database Schema

### New Table: `documents`

```typescript
// In services/backend/convex/schema.ts
documents: defineTable({
  userId: v.id('users'),
  title: v.string(),
  content: v.optional(v.string()), // HTML from RichTextEditor
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_user_updated', ['userId', 'updatedAt'])  // For sorting by last updated
```

## Backend API

### New File: `services/backend/convex/documents.ts`

```typescript
// Queries
export const getDocuments = query({
  args: { ...SessionIdArg },
  handler: async (ctx, args) => {
    // Return all documents for user, sorted by updatedAt desc
  },
});

export const getDocument = query({
  args: { ...SessionIdArg, documentId: v.id('documents') },
  handler: async (ctx, args) => {
    // Return single document by ID
  },
});

export const searchDocuments = query({
  args: { ...SessionIdArg, query: v.string() },
  handler: async (ctx, args) => {
    // Search documents by title/content
  },
});

// Mutations
export const createDocument = mutation({
  args: { ...SessionIdArg, title: v.string(), content: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Create new document
  },
});

export const updateDocument = mutation({
  args: { 
    ...SessionIdArg, 
    documentId: v.id('documents'),
    title: v.optional(v.string()), 
    content: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    // Update existing document
  },
});

export const deleteDocument = mutation({
  args: { ...SessionIdArg, documentId: v.id('documents') },
  handler: async (ctx, args) => {
    // Delete document
  },
});
```

## Frontend Components

### New Route: `/app/documents`

```
apps/webapp/src/app/app/documents/
├── page.tsx              # Document list page
├── [documentId]/
│   └── page.tsx          # Single document view/edit page
└── new/
    └── page.tsx          # Create new document page (optional, could use modal)
```

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `DocumentList` | `molecules/documents/` | List of documents with search |
| `DocumentCard` | `atoms/` | Card preview of a document |
| `DocumentEditor` | `organisms/documents/` | Rich text editor for documents |
| `DocumentHeader` | `molecules/documents/` | Title and actions bar |

### Reusing Existing Components

- `RichTextEditor` - Already exists in `components/ui/rich-text-editor.tsx`
- Standard ShadCN components (Button, Input, Card, Dialog)

## Navigation

Add "Documents" link to the main navigation/menu. Options:
1. Sidebar menu item
2. Command palette option (can be searched via CMD+K)

## Data Flow

```
User creates document
        ↓
Frontend calls createDocument mutation
        ↓
Backend validates user, inserts into documents table
        ↓
Real-time update reflects in document list
```
