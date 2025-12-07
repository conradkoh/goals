import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { createContext, type ReactNode, useContext } from 'react';

/**
 * Context for providing goal data to nested components.
 * Eliminates prop drilling of goal objects through multiple component layers.
 */
interface GoalContextValue {
  /** The current goal object with full details and nested children */
  goal: GoalWithDetailsAndChildren;
}

const GoalContext = createContext<GoalContextValue | undefined>(undefined);

/**
 * Props for the GoalProvider component.
 */
interface GoalProviderProps {
  /** The goal to provide to nested components */
  goal: GoalWithDetailsAndChildren;
  /** Child components that can access the goal via useGoalContext */
  children: ReactNode;
}

/**
 * Provider component that makes a goal object available to all nested components.
 * Wrap this around any component tree that needs access to a specific goal.
 *
 * @example
 * ```tsx
 * <GoalProvider goal={myGoal}>
 *   <GoalActionMenu />
 *   <GoalDetailsContent />
 * </GoalProvider>
 * ```
 */
export function GoalProvider({ goal, children }: GoalProviderProps) {
  return <GoalContext.Provider value={{ goal }}>{children}</GoalContext.Provider>;
}

/**
 * Hook to access the current goal from context.
 * Must be used within a GoalProvider.
 *
 * @throws Error if used outside of GoalProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { goal } = useGoalContext();
 *   return <div>{goal.title}</div>;
 * }
 * ```
 */
export function useGoalContext() {
  const context = useContext(GoalContext);
  if (!context) {
    throw new Error('useGoalContext must be used within a GoalProvider');
  }
  return context;
}

/**
 * Hook to optionally access the current goal from context.
 * Returns undefined if used outside of GoalProvider.
 * Useful for components that can work with or without a goal context.
 *
 * @example
 * ```tsx
 * function MyComponent({ goal: goalProp }: { goal?: GoalWithDetailsAndChildren }) {
 *   const contextGoal = useOptionalGoalContext();
 *   const goal = contextGoal?.goal ?? goalProp;
 *   if (!goal) return null;
 *   return <div>{goal.title}</div>;
 * }
 * ```
 */
export function useOptionalGoalContext() {
  return useContext(GoalContext);
}
