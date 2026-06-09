'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { Theme } from './theme-utils';

type ThemeProviderProps = {
  children: React.ReactNode;
  /**
   * Optional CSS selector to apply the theme class to, rather than the html element.
   * Use for testing alternative theme application strategies.
   */
  targetSelector?: string;
};

type ThemeContextData = {
  setTheme: (theme: Theme) => void;
  theme: Theme | null;
};

const ThemeContext = createContext<ThemeContextData | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Returns whether the app is currently in dark mode.
 * This resolves 'system' theme to the actual mode based on the document class.
 */
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if the dark class is present on the document
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    // Initial check
    checkDarkMode();

    // Observe changes to the class attribute
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          checkDarkMode();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

// Script to prevent flash of incorrect theme
// Exported so layout.tsx can inject it via next/script before hydration
export const themeScript = `
(() => {
  window.__theme = {
    value: localStorage.getItem('theme') || 'system',
    onThemeChange: () => {
      const theme = window.__theme.value;
      let nextTheme = theme;
      // we interpret system theme to be the actual theme value for the transition
      if (nextTheme === 'system') {
        nextTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      switch (nextTheme) {
        case 'dark': {
          document.documentElement.classList.add('dark');
          // V2 Industrial: Dark Steel theme background (zinc-950)
          document.documentElement.style.backgroundColor = '#09090b';
          break;
        }
        case 'light': {
          document.documentElement.classList.remove('dark');
          // V2 Industrial: Neutral Glass theme background (neutral-100)
          document.documentElement.style.backgroundColor = '#f5f5f5';
          break;
        }
      }
    },
    /**
     * @param {'light' | 'dark' | 'system'} theme - The theme to set.
     * @description Sets the theme and updates the document background color.
     */
    setTheme: (theme) => {
      if (theme == null) {
        return;
      }
      // set the window values and persist
      window.__theme.value = theme;
      localStorage.setItem('theme', theme);

      // trigger the update
      window.__theme.onThemeChange();
    },
    init: () => {
      const theme = window.__theme.value;
      window.__theme.setTheme(theme);
    },
  };

  window.__theme.init(); //trigger the initial theme

  // listen to updates from the system
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', window.__theme.onThemeChange);

  // Re-apply theme when page becomes visible again (e.g., after mobile background)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      window.__theme.onThemeChange();
    }
  });
})();
`;

export function ThemeProvider({ children, targetSelector }: ThemeProviderProps) {
  const attribute = targetSelector ? 'data-theme' : 'class';
  const [theme, _setTheme] = useState<Theme | null>(null);
  const setTheme = useCallback((theme: Theme) => {
    _setTheme(theme);
    window.__theme.setTheme(theme);
  }, []);

  // We need to use this component pattern for hydration safety
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <NextThemesProvider
        attribute={attribute}
        defaultTheme="system"
        enableSystem
        themes={['light', 'dark']}
        enableColorScheme
        storageKey="theme"
        // If a target selector is provided, use it as the element to apply theme to
        {...(targetSelector && { selector: targetSelector })}
      >
        {children}
      </NextThemesProvider>
    </ThemeContext.Provider>
  );
}

declare global {
  interface Window {
    __theme: {
      value: Theme;
      onThemeChange: () => void;
      setTheme: (theme: Theme) => void;
    };
  }
}
