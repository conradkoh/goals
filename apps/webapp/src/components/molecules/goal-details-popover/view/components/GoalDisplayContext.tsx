import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Display mode for goal details view.
 * - popover: Standard popover overlay
 * - fullscreen: Full screen dialog modal
 */
type _DisplayMode = 'popover' | 'fullscreen';

/**
 * Context value type for goal display state management.
 */
interface _GoalDisplayContextType {
  /** Current display mode (popover or fullscreen) */
  displayMode: _DisplayMode;
  /** Request to show fullscreen view */
  requestFullScreen: () => void;
  /** Request to close fullscreen view (returns to popover) */
  closeFullScreen: () => void;
  /** Whether fullscreen is currently open */
  isFullScreenOpen: boolean;
}

const _GoalDisplayContext = createContext<_GoalDisplayContextType | undefined>(undefined);

/**
 * Hook to access the goal display context.
 * Use this in GoalActionMenu to trigger fullscreen mode.
 *
 * @throws Error if used outside of GoalDisplayProvider
 *
 * @example
 * ```tsx
 * const { requestFullScreen, isFullScreenOpen } = useGoalDisplayContext();
 * ```
 */
export function useGoalDisplayContext(): _GoalDisplayContextType {
  const context = useContext(_GoalDisplayContext);
  if (context === undefined) {
    throw new Error('useGoalDisplayContext must be used within a GoalDisplayProvider');
  }
  return context;
}

/**
 * Optional hook that returns undefined if not in context.
 * Use this when the component might be used outside of GoalDisplayProvider.
 *
 * @example
 * ```tsx
 * const displayContext = useGoalDisplayContextOptional();
 * if (displayContext?.isFullScreenOpen) {
 *   // Handle fullscreen state
 * }
 * ```
 */
export function useGoalDisplayContextOptional(): _GoalDisplayContextType | undefined {
  return useContext(_GoalDisplayContext);
}

/**
 * Props for the GoalDisplayProvider component.
 */
interface _GoalDisplayProviderProps {
  /** Child components that need access to display context */
  children: ReactNode;
}

/**
 * Provider for managing goal display mode (popover vs fullscreen).
 * Wraps goal popover variants to enable action menu to trigger fullscreen.
 *
 * @example
 * ```tsx
 * <GoalDisplayProvider>
 *   <GoalPopover />
 * </GoalDisplayProvider>
 * ```
 */
export function GoalDisplayProvider({ children }: _GoalDisplayProviderProps) {
  const [displayMode, setDisplayMode] = useState<_DisplayMode>('popover');
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

  /** Opens fullscreen view */
  const requestFullScreen = useCallback(() => {
    setDisplayMode('fullscreen');
    setIsFullScreenOpen(true);
  }, []);

  /** Closes fullscreen view and returns to popover mode */
  const closeFullScreen = useCallback(() => {
    setIsFullScreenOpen(false);
    setDisplayMode('popover');
  }, []);

  const value = useMemo(
    () => ({
      displayMode,
      requestFullScreen,
      closeFullScreen,
      isFullScreenOpen,
    }),
    [displayMode, requestFullScreen, closeFullScreen, isFullScreenOpen]
  );

  return <_GoalDisplayContext.Provider value={value}>{children}</_GoalDisplayContext.Provider>;
}
