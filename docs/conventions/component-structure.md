# Component Structure Convention

This document describes the component organization pattern used for complex, composable components. This pattern is exemplified in `goal-details-popover` and should be used when building components that:

- Have multiple variants for different use cases
- Need to be composable for custom implementations
- Share state across child components via context
- Require both high-level "ready to use" and low-level "building block" exports

## Directory Structure

```
component-name/
├── index.ts              # Entry point with documentation and re-exports
├── variants/             # Pre-composed variants for common use cases
│   ├── index.ts
│   ├── VariantA.tsx
│   └── VariantB.tsx
└── view/                 # Base components and composable building blocks
    ├── index.ts
    ├── MainView.tsx      # Primary view/shell component
    └── components/       # Composable pieces
        ├── index.ts
        ├── Header.tsx
        ├── SomeContext.tsx
        └── ...
```

## Layer Responsibilities

### Root `index.ts`

The entry point serves dual purposes:

1. **Documentation Hub**: JSDoc comment block explaining the architecture, usage patterns, and examples
2. **Re-export Aggregator**: Clean exports from both `variants/` and `view/`

```typescript
/**
 * Component Name
 *
 * ## Architecture
 * Brief description of the composition pattern...
 *
 * ## Usage
 *
 * ### Using Pre-composed Variants (Recommended)
 * ```tsx
 * import { VariantA } from '@/components/molecules/component-name';
 * <VariantA prop={value} />
 * ```
 *
 * ### Building Custom Compositions
 * ```tsx
 * import { MainView, Header } from '@/components/molecules/component-name/view';
 * <MainView>
 *   <Header ... />
 * </MainView>
 * ```
 */

// Re-export variants (most common usage)
export * from './variants';

// Re-export view components for custom compositions
export * from './view';
```

### `variants/` - Pre-composed Components

**Purpose**: Ready-to-use components for specific use cases. These are what most consumers should import.

**Characteristics**:
- Each variant is a fully composed component with sensible defaults
- Variants import and compose building blocks from `view/`
- Provide context providers needed by child components
- Handle variant-specific business logic

```typescript
// variants/VariantA.tsx
export interface VariantAProps {
  onSave: SaveHandler;
  triggerClassName?: string;
}

export function VariantA({ onSave, triggerClassName }: VariantAProps) {
  // Setup state, handlers, etc.

  return (
    <SomeContextProvider>
      <AnotherContextProvider>
        <_VariantAContent ... />
      </AnotherContextProvider>
    </SomeContextProvider>
  );
}

// Internal component to access context
function _VariantAContent({ ... }: _VariantAContentProps) {
  const { value } = useSomeContext();
  // Compose view components
}
```

### `view/` - Base Components & Building Blocks

**Purpose**: Provides the shell component and exports all composable pieces.

```typescript
// view/index.ts
export * from './components';
export {
  MainView,
  type MainViewProps,
  TriggerComponent,
  type TriggerComponentProps,
} from './MainView';
```

### `view/components/` - Composable Pieces

**Purpose**: Small, focused components that can be mixed and matched.

**Categories**:
- **Context Providers**: State management for the component tree
- **Display Components**: Pure presentational pieces (Header, Footer, etc.)
- **Feature Components**: Specific functionality (ActionMenu, EditModal, etc.)

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Variant | `PascalCase` matching the variant name | `WeeklyGoalPopover.tsx` |
| View component | `PascalCase` matching the component | `GoalHeader.tsx` |
| Context | `PascalCase` with `Context` suffix | `GoalDisplayContext.tsx` |
| Index files | Always `index.ts` | `index.ts` |

### Exports

| Type | Convention | Example |
|------|------------|---------|
| Component | `PascalCase` | `GoalHeader` |
| Props interface | Component name + `Props` | `GoalHeaderProps` |
| Context hook | `use` + Context name | `useGoalDisplayContext` |
| Provider | Context name + `Provider` | `GoalDisplayProvider` |

### Internal (Non-exported) Items

Use underscore prefix for internal types and components:

```typescript
// Internal type
interface _GoalDisplayContextType { ... }

// Internal component
function _WeeklyGoalPopoverContent({ ... }) { ... }

// Internal context
const _GoalDisplayContext = createContext<...>(undefined);
```

## Export Patterns

### Barrel Files (`index.ts`)

Each folder should have an `index.ts` that:
1. Documents the folder's purpose via JSDoc
2. Exports all public components and their types

```typescript
// variants/index.ts
/**
 * @fileoverview Goal popover variants for different goal types.
 */

export { VariantA, type VariantAProps } from './VariantA';
export { VariantB, type VariantBProps } from './VariantB';
```

### Type Exports

Always export the Props type alongside the component:

```typescript
export { GoalHeader, type GoalHeaderProps } from './GoalHeader';
```

## Context Providers

### Structure

```typescript
// 1. Type definitions (internal)
interface _ContextType {
  value: string;
  action: () => void;
}

// 2. Context creation (internal)
const _Context = createContext<_ContextType | undefined>(undefined);

// 3. Hook (exported)
export function useContextName(): _ContextType {
  const context = useContext(_Context);
  if (context === undefined) {
    throw new Error('useContextName must be used within a ContextProvider');
  }
  return context;
}

// 4. Optional hook for when context might not exist
export function useContextNameOptional(): _ContextType | undefined {
  return useContext(_Context);
}

// 5. Provider (exported)
export function ContextProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({ ... }), [...]);
  return <_Context.Provider value={value}>{children}</_Context.Provider>;
}
```

### Provider Composition in Variants

Variants wrap content with necessary providers:

```typescript
export function VariantA(props: VariantAProps) {
  return (
    <EditProvider>
      <DisplayProvider>
        <_VariantAContent {...props} />
      </DisplayProvider>
    </EditProvider>
  );
}
```

## Component Props

### Slot Props Pattern

Use ReactNode props for composable slots:

```typescript
interface GoalHeaderProps {
  title: string;
  isComplete: boolean;
  /** Optional slot for status controls (left of actions) */
  statusControls?: ReactNode;
  /** Optional slot for action menu (right side) */
  actionMenu?: ReactNode;
}
```

### Callback Props Pattern

Use typed handler functions:

```typescript
interface ComponentProps {
  /** Callback when goal is saved */
  onSave: GoalSaveHandler;
  /** Callback when completion is toggled */
  onToggleComplete?: GoalCompletionHandler;
}
```

## Documentation

### JSDoc Comments

Every exported component and interface should have JSDoc:

```typescript
/**
 * Composable header component for goal details.
 * Renders title with completion checkbox and optional status controls.
 *
 * @example
 * ```tsx
 * <GoalHeader
 *   title="My Goal"
 *   isComplete={false}
 *   onToggleComplete={(checked) => handleToggle(checked)}
 *   actionMenu={<GoalActionMenu ... />}
 * />
 * ```
 */
export function GoalHeader({ ... }: GoalHeaderProps) { ... }
```

## Import Patterns

### For Consumers

```typescript
// Most common: use variants
import { VariantA, VariantB } from '@/components/molecules/component-name';

// For custom compositions
import {
  MainView,
  Header,
  Footer,
} from '@/components/molecules/component-name/view';
```

### Within the Component (Internal)

```typescript
// Variants import from view
import { Header, Footer, SomeProvider } from '../view/components';
import { MainView } from '../view/MainView';
```

## When to Use This Pattern

✅ **Use this pattern when**:
- Component has 3+ variants for different use cases
- Components need to share state (via context)
- Consumers may need to build custom compositions
- The component has significant complexity

❌ **Don't use this pattern for**:
- Simple, single-purpose components
- Components with only 1-2 variants
- Components that don't need composition flexibility
- Atoms or basic UI elements




