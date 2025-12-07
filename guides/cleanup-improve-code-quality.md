# Code Quality Cleanup Routine

## Core Principles

1. **Readability First**: Code MUST tell a story from top to bottom
2. **Intentional Organization**: Most important elements MUST be immediately visible
3. **Clear Boundaries**: Internal vs. external APIs MUST be obvious
4. **Self-Documenting**: Functions and interfaces MUST explain their purpose

## Quick Start

**Target files**: `git status --porcelain | grep -E '\.(ts|tsx|js|jsx)$' | awk '{print $2}'`

**For each file, follow steps 1-8 in order:**

## Step-by-Step Process

### Step 1: Add Function Comments

**MUST do:**

- Add descriptive comment above EVERY function AND exported interface/type
- Use present tense ("Creates", "Validates", "Displays", "Represents", "Defines")
- Describe WHAT it does, not HOW
- NEVER add process comments (e.g., "// 2. Public interfaces") in code output
- SKIP this step entirely if file has no functions or exported interfaces/types

### Step 2: Prefix Internal Elements

**MUST do:**

- Add `_` prefix to ALL non-exported items
- Update ALL references to use new prefixed names
- NEVER add process comments (e.g., "// 2. Prefix internal elements") in code output
- SKIP this step entirely if file has no internal elements

```typescript
// Functions
function _validateInput(input: string): boolean {}

// Interfaces and Types
interface _UserState {}
type _ValidationResult = {};

// Constants
const _DEFAULT_TIMEOUT = 5000;
```

### Step 3: Eliminate `any` Types

**NEVER use:**

- `any` type anywhere in the file

**MUST use:**

- Specific interfaces and types
- Proper React event types: `React.MouseEvent<HTMLButtonElement>`
- Proper Convex types: `QueryCtx`, `MutationCtx`

**NEVER add:**

- Process comments (e.g., "// 3. Eliminate any types") in code output
- SKIP this step entirely if file has no `any` types

```typescript
// ❌ Replace this
function processData(data: any): any {}

// ✅ With this
interface DataItem {
  id: string;
  value: number;
}
function processData(data: DataItem[]): number[] {}

// ✅ Proper event types
function handleClick(event: React.MouseEvent<HTMLButtonElement>) {}

// ✅ Proper Convex types
import { type MutationCtx, type QueryCtx } from "./_generated/server";
```

### Step 4: Reorganize File Structure

**MUST follow this exact order:**

1. Imports (external first, then internal)
2. Public interfaces and types
3. Internal interfaces and types (prefixed with `_`)
4. Exported functions/components
5. Internal helper functions (at bottom)

**IMPORTANT:**

- NEVER add section comments (e.g., "// 1. Imports", "// 2. Public interfaces") in code output
- ONLY reorganize if file structure is incorrect
- SKIP this step entirely if file already follows correct structure```typescript
  import React from "react";
  import { api } from "@/convex/\_generated/api";

/\*\*

- Props for user profile component.
  \*/
  export interface UserProfileProps {}

/\*\*

- Available user roles in the system.
  \*/
  export type UserRole = "admin" | "user" | "guest";

interface \_UserState {}
type \_ValidationResult = {};

/\*\*

- Displays user profile information and settings.
  \*/
  export function UserProfile({ userId }: UserProfileProps) {}

/\*\*

- Validates user data against business rules.
  \*/
  function \_validateUserData(userData: CreateUserRequest): \_ValidationResult {}

````

### Step 5: React Performance

**MUST use `useCallback` for:**

- Functions passed as props
- Functions used as hook dependencies

**MUST use `useMemo` for:**

- Expensive calculations only

**NEVER memoize:**

- Primitive values (strings, booleans, numbers)

**IMPORTANT:**
- SKIP this step entirely for non-React files (.ts files without JSX)
- NEVER add process comments in code output

```typescript
// ✅ Use useCallback for functions passed as props
const handleUserClick = useCallback((userId: string) => {
  setSelectedId(userId);
}, []);

// ✅ Use useMemo for expensive calculations
const analytics = useMemo(() => {
  return users.reduce((acc, user) => {
    // Complex calculation
  }, {});
}, [users, filter]);

// ❌ Don't memoize these
const displayName = `${user.firstName} ${user.lastName}`; // String - no useMemo
const isAdult = user.age >= 18; // Boolean - no useMemo
````

### Step 6: Quality Check

**MUST verify:**

- [ ] All functions have comments
- [ ] All non-exported items prefixed with `_`
- [ ] File follows exact organization structure
- [ ] Zero `any` types exist
- [ ] All event handlers use proper types
- [ ] Functions as props use `useCallback`

### Step 7: Clean Up Unused Files

**NEVER delete:**

- Configuration files (`package.json`, `tsconfig.json`, etc.)
- Entry points (`index.ts`, `page.tsx`, `layout.tsx`, etc.)
- Generated files (`_generated/`, `.d.ts`)
- Framework files (`middleware.ts`, `manifest.ts`, etc.)

**Search commands:**

```bash
# Search for file name (without extension)
grep -r "filename" . --exclude-dir=node_modules --exclude-dir=.git

# Search for import statements
grep -r "import.*filename" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "from.*filename" . --exclude-dir=node_modules --exclude-dir=.git

# Search for dynamic imports
grep -r "import(" . --exclude-dir=node_modules --exclude-dir=.git | grep "filename"
```

**MUST verify before deletion:**

- [ ] Search for file name references
- [ ] Search for import statements
- [ ] Check configuration files
- [ ] Verify not in protected directories

### Step 8: Design Review

**Component Design MUST have:**

- [ ] Single, clear responsibility
- [ ] Well-named, typed, minimal props
- [ ] Proper state scoping
- [ ] Error handling
- [ ] Accessibility support

**API Design MUST have:**

- [ ] Clear function names
- [ ] Required params first, optional last
- [ ] Predictable return types
- [ ] Consistent error handling

**Dark Mode MUST use:**

- [ ] Semantic colors (`text-foreground`, `bg-card`)
- [ ] Dark variants for status colors (`bg-red-50 dark:bg-red-950/20`)
- [ ] NEVER hardcoded colors (`text-black`, `bg-white`)

## Complete Example

### ❌ Before Cleanup

```typescript
import React from "react";

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

export function UserForm({ onSubmit }: UserFormProps) {
  const handleSubmit = (data: any) => {
    if (validateEmail(data.email)) {
      onSubmit(data);
    }
  };
  return <form onSubmit={handleSubmit}>...</form>;
}

interface UserFormProps {
  onSubmit: (data: FormData) => void;
}
```

### ✅ After Cleanup (Steps 1-8)

```typescript
import React, { useCallback } from "react";

/**
 * Props for user registration form component.
 */
export interface UserFormProps {
  onSubmit: (data: FormData) => void;
}

interface _FormData {
  email: string;
  name: string;
}

/**
 * User registration form with validation and submission handling.
 */
export function UserForm({ onSubmit }: UserFormProps) {
  /**
   * Handles form submission with email validation.
   */
  const handleSubmit = useCallback(
    (data: _FormData) => {
      if (_validateEmail(data.email)) {
        onSubmit(data);
      }
    },
    [onSubmit]
  );

  return <form onSubmit={handleSubmit}>...</form>;
}

/**
 * Validates email format using regex pattern.
 */
function _validateEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}
```

## Usage

### 1. Initialize Progress Tracking

```bash
# Get list of modified files
git status --porcelain | grep -E '\.(ts|tsx|js|jsx)$' | awk '{print $2}' > modified-files.txt
```

Create `cleanup-progress.md` with file list and checklists:

```markdown
# Code Quality Cleanup Progress

## Files to Process

- [ ] file1.tsx
- [ ] file2.ts
- [ ] file3.tsx

## file1.tsx

- [ ] Step 1: Add function comments
- [ ] Step 2: Prefix internal elements
- [ ] Step 3: Eliminate any types
- [ ] Step 4: Reorganize file structure
- [ ] Step 5: React performance
- [ ] Step 6: Quality check
- [ ] Step 7: Clean up unused files
- [ ] Step 8: Design review

## file2.ts

- [ ] Step 1: Add function comments
- [ ] Step 2: Prefix internal elements
- [ ] Step 3: Eliminate any types
- [ ] Step 4: Reorganize file structure
- [ ] Step 5: React performance (N/A - not React)
- [ ] Step 6: Quality check
- [ ] Step 7: Clean up unused files
- [ ] Step 8: Design review
```

### 2. Execute Cleanup Process

**For each file in cleanup-progress.md:**

1. **Work through steps 1-8** in order
2. **Update progress** after each completed step
3. **Mark N/A** for non-applicable steps (e.g., React performance for non-React files)
4. **Complete all steps** before moving to next file

### 3. Progress Updates

After completing each step:

```bash
# Update the checkbox in cleanup-progress.md
- [x] Step 1: Add function comments ✓
```

### 4. Completion

Continue until all files show:

```markdown
## file1.tsx ✅ COMPLETE

- [x] Step 1: Add function comments ✓
- [x] Step 2: Prefix internal elements ✓
- [x] Step 3: Eliminate any types ✓
- [x] Step 4: Reorganize file structure ✓
- [x] Step 5: React performance ✓
- [x] Step 6: Quality check ✓
- [x] Step 7: Clean up unused files ✓
- [x] Step 8: Design review ✓
```
