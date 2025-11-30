import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Context value type for goal editing state management.
 */
interface _GoalEditContextType {
  /** Whether the edit modal is currently open */
  isEditing: boolean;
  /** The goal currently being edited, or null if not editing */
  editingGoal: GoalWithDetailsAndChildren | null;
  /** Opens the edit modal for the specified goal */
  startEditing: (goal: GoalWithDetailsAndChildren) => void;
  /** Closes the edit modal and clears the editing goal */
  stopEditing: () => void;
}

const _GoalEditContext = createContext<_GoalEditContextType | undefined>(undefined);

/**
 * Hook to access the goal edit context.
 * Use this to control the edit modal state from action menus.
 *
 * @throws Error if used outside of GoalEditProvider
 *
 * @example
 * ```tsx
 * const { startEditing, isEditing } = useGoalEditContext();
 * ```
 */
export function useGoalEditContext(): _GoalEditContextType {
  const context = useContext(_GoalEditContext);
  if (context === undefined) {
    throw new Error('useGoalEditContext must be used within a GoalEditProvider');
  }
  return context;
}

/**
 * Props for the GoalEditProvider component.
 */
interface _GoalEditProviderProps {
  /** Child components that need access to edit context */
  children: ReactNode;
}

/**
 * Provider for managing goal editing state.
 * Wraps goal popover variants to enable action menu to trigger edit modal.
 *
 * @example
 * ```tsx
 * <GoalEditProvider>
 *   <GoalPopover />
 * </GoalEditProvider>
 * ```
 */
export function GoalEditProvider({ children }: _GoalEditProviderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithDetailsAndChildren | null>(null);

  /** Opens the edit modal for the specified goal */
  const startEditing = useCallback((goal: GoalWithDetailsAndChildren) => {
    setEditingGoal(goal);
    setIsEditing(true);
  }, []);

  /** Closes the edit modal and clears the editing goal */
  const stopEditing = useCallback(() => {
    setIsEditing(false);
    setEditingGoal(null);
  }, []);

  const value = useMemo(
    () => ({
      isEditing,
      editingGoal,
      startEditing,
      stopEditing,
    }),
    [isEditing, editingGoal, startEditing, stopEditing]
  );

  return <_GoalEditContext.Provider value={value}>{children}</_GoalEditContext.Provider>;
}
