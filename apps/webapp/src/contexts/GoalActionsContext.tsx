import { createContext, type ReactNode, useContext } from 'react';
import type { GoalDeleteHandler, GoalUpdateHandler } from '@/models/goal-handlers';

/**
 * Context for goal-related actions.
 * Provides centralized handlers for updating and deleting goals,
 * eliminating the need to pass these handlers through multiple component layers.
 */
interface GoalActionsContextType {
  /** Handler for updating a goal's title, details, and due date */
  onUpdateGoal: GoalUpdateHandler;

  /** Handler for deleting a goal */
  onDeleteGoal: GoalDeleteHandler;
}

const GoalActionsContext = createContext<GoalActionsContextType | undefined>(undefined);

interface GoalActionsProviderProps {
  children: ReactNode;
  onUpdateGoal: GoalUpdateHandler;
  onDeleteGoal: GoalDeleteHandler;
}

/**
 * Provider component that supplies goal action handlers to all child components.
 *
 * @example
 * ```tsx
 * <GoalActionsProvider onUpdateGoal={handleUpdate} onDeleteGoal={handleDelete}>
 *   <YourComponents />
 * </GoalActionsProvider>
 * ```
 */
export function GoalActionsProvider({
  children,
  onUpdateGoal,
  onDeleteGoal,
}: GoalActionsProviderProps) {
  return (
    <GoalActionsContext.Provider value={{ onUpdateGoal, onDeleteGoal }}>
      {children}
    </GoalActionsContext.Provider>
  );
}

/**
 * Hook to access goal action handlers from context.
 *
 * @throws Error if used outside of GoalActionsProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { onUpdateGoal, onDeleteGoal } = useGoalActionsContext();
 *
 *   const handleEdit = async () => {
 *     await onUpdateGoal(goalId, newTitle, newDetails, newDueDate);
 *   };
 * }
 * ```
 */
export function useGoalActionsContext() {
  const context = useContext(GoalActionsContext);
  if (!context) {
    throw new Error('useGoalActionsContext must be used within a GoalActionsProvider');
  }
  return context;
}
