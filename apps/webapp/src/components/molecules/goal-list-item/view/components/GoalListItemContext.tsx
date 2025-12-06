import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { GoalUpdatePendingHandler } from '@/models/goal-handlers';

/**
 * Internal context type for goal list item pending state.
 */
interface _GoalListItemContextType {
  /** Whether an update is currently pending */
  isPending: boolean;

  /** Register a pending update promise */
  setPendingUpdate: GoalUpdatePendingHandler;
}

const _GoalListItemContext = createContext<_GoalListItemContextType | undefined>(undefined);

/**
 * Hook to access the goal list item context.
 * Provides pending state and update tracking for goal list items.
 *
 * @throws Error if used outside of GoalListItemProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isPending, setPendingUpdate } = useGoalListItemContext();
 *
 *   const handleSave = async () => {
 *     const promise = saveGoal();
 *     setPendingUpdate(promise);
 *     await promise;
 *   };
 *
 *   return isPending ? <Spinner /> : <Content />;
 * }
 * ```
 */
export function useGoalListItemContext(): _GoalListItemContextType {
  const context = useContext(_GoalListItemContext);
  if (context === undefined) {
    throw new Error('useGoalListItemContext must be used within a GoalListItemProvider');
  }
  return context;
}

/**
 * Optional hook to access the goal list item context.
 * Returns undefined if used outside of GoalListItemProvider.
 */
export function useGoalListItemContextOptional(): _GoalListItemContextType | undefined {
  return useContext(_GoalListItemContext);
}

interface GoalListItemProviderProps {
  children: ReactNode;
}

/**
 * Provider component for goal list item pending state.
 * Tracks pending updates and provides loading state to child components.
 *
 * @example
 * ```tsx
 * <GoalListItemProvider>
 *   <GoalCheckbox />
 *   <GoalTitleTrigger />
 *   <GoalActionButtons />
 * </GoalListItemProvider>
 * ```
 */
export function GoalListItemProvider({ children }: GoalListItemProviderProps) {
  const [isPending, setIsPending] = useState(false);

  const setPendingUpdate = useCallback((promise: Promise<void>) => {
    setIsPending(true);
    promise.finally(() => setIsPending(false));
  }, []);

  const value = useMemo(() => ({ isPending, setPendingUpdate }), [isPending, setPendingUpdate]);

  return <_GoalListItemContext.Provider value={value}>{children}</_GoalListItemContext.Provider>;
}
