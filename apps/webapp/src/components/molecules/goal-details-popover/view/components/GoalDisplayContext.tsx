import { createContext, type ReactNode, useContext, useState } from 'react';

type DisplayMode = 'popover' | 'fullscreen';

interface GoalDisplayContextType {
  /** Current display mode */
  displayMode: DisplayMode;
  /** Request to show fullscreen view */
  requestFullScreen: () => void;
  /** Request to close fullscreen view (returns to popover) */
  closeFullScreen: () => void;
  /** Whether fullscreen is currently open */
  isFullScreenOpen: boolean;
}

const GoalDisplayContext = createContext<GoalDisplayContextType | undefined>(undefined);

/**
 * Hook to access the goal display context.
 * Use this in GoalActionMenu to trigger fullscreen mode.
 */
export function useGoalDisplayContext() {
  const context = useContext(GoalDisplayContext);
  if (context === undefined) {
    throw new Error('useGoalDisplayContext must be used within a GoalDisplayProvider');
  }
  return context;
}

/**
 * Optional hook that returns undefined if not in context.
 * Use this when the component might be used outside of GoalDisplayProvider.
 */
export function useGoalDisplayContextOptional() {
  return useContext(GoalDisplayContext);
}

interface GoalDisplayProviderProps {
  children: ReactNode;
}

/**
 * Provider for managing goal display mode (popover vs fullscreen).
 * Wraps goal popover variants to enable action menu to trigger fullscreen.
 */
export function GoalDisplayProvider({ children }: GoalDisplayProviderProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('popover');
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

  const requestFullScreen = () => {
    setDisplayMode('fullscreen');
    setIsFullScreenOpen(true);
  };

  const closeFullScreen = () => {
    setIsFullScreenOpen(false);
    setDisplayMode('popover');
  };

  const value = {
    displayMode,
    requestFullScreen,
    closeFullScreen,
    isFullScreenOpen,
  };

  return <GoalDisplayContext.Provider value={value}>{children}</GoalDisplayContext.Provider>;
}
