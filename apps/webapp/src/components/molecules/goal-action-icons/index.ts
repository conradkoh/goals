/**
 * Goal Action Icons
 *
 * Composable components for displaying goal action icons (Fire, Pending, Edit, Delete).
 * This component consolidates multiple implementations across the codebase into a single,
 * reusable pattern following the component structure convention.
 *
 * ## Architecture
 *
 * The component follows a 3-layer architecture:
 *
 * 1. **Root**: Entry point with documentation and re-exports
 * 2. **Variants**: Pre-composed components for specific goal types (adhoc, quarterly, etc.)
 * 3. **View**: Composable building blocks (container, individual icon buttons)
 *
 * ## Usage
 *
 * ### Using Pre-composed Variants (Recommended)
 *
 * For most use cases, import and use the variant that matches your goal type:
 *
 * ```tsx
 * import { AdhocGoalActionIcons } from '@/components/molecules/goal-action-icons';
 *
 * <AdhocGoalActionIcons
 *   goalId={goal._id}
 *   title={goal.title}
 *   details={goal.details}
 *   showFire
 *   showPending
 *   showEdit
 *   showDelete
 *   onSave={handleSave}
 *   onDelete={handleDelete}
 *   showSpinner={isPending}
 * />
 * ```
 *
 * ### Building Custom Compositions
 *
 * For advanced use cases, compose individual icon buttons:
 *
 * ```tsx
 * import {
 *   GoalActionIconsView,
 *   FireIconButton,
 *   PendingIconButton,
 *   EditIconButton,
 *   DeleteIconButton,
 * } from '@/components/molecules/goal-action-icons/view';
 *
 * <GoalActionIconsView showSpinner={isLoading}>
 *   <FireIconButton goalId={goal._id} />
 *   <PendingIconButton goalId={goal._id} />
 *   {canEdit && (
 *     <EditIconButton
 *       title={goal.title}
 *       onSave={handleSave}
 *     />
 *   )}
 *   {canDelete && <DeleteIconButton onDelete={handleDelete} />}
 * </GoalActionIconsView>
 * ```
 *
 * ## Icon Order
 *
 * Icons are displayed in this standard order:
 * 1. Fire (urgent/on-fire status)
 * 2. Pending (pending status)
 * 3. Edit (edit popover trigger)
 * 4. Delete (delete action)
 *
 * ## Styling
 *
 * The component uses consistent styling across all implementations:
 * - Container: `flex items-center gap-1 flex-shrink-0`
 * - Icons: `h-3.5 w-3.5` (uniform sizing)
 * - Hover behavior: `opacity-0 group-hover/title:opacity-100` for edit/delete
 * - Fire/Pending icons manage their own visibility based on status
 *
 * ## Loading States
 *
 * Use the `showSpinner` prop to display a loading spinner instead of icons:
 *
 * ```tsx
 * <AdhocGoalActionIcons
 *   goalId={goal._id}
 *   showSpinner={isPending || isOptimistic}
 *   // ... other props
 * />
 * ```
 */

// Re-export variants (most common usage)
export * from './variants';

// Re-export view components for custom compositions
export * from './view';
