import { isTypingTarget } from '@/lib/keyboard/isTypingTarget';

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  if (navigatorWithStandalone.standalone) {
    return true;
  }

  const matchMedia = window.matchMedia;
  if (typeof matchMedia !== 'function') {
    return false;
  }

  return ['standalone', 'fullscreen'].some((mode) => matchMedia(`(display-mode: ${mode})`).matches);
}

/**
 * Ensures the document can receive keyboard events in standalone PWA mode.
 *
 * WebKit standalone PWAs (Add to Home Screen) often do not deliver keydown events
 * until the page has keyboard focus — unlike the same site in a Safari tab.
 * Making body focusable and refocusing after non-typing interactions keeps
 * single-key shortcuts working after normal UI use.
 */
function setupPwaKeyboardFocus(): () => void {
  const body = document.body;
  const previousTabIndex = body.getAttribute('tabindex');

  body.tabIndex = -1;
  body.focus({ preventScroll: true });

  const refocusBody = (event: PointerEvent) => {
    const target = event.target;
    if (target instanceof HTMLElement && !isTypingTarget(target)) {
      body.focus({ preventScroll: true });
    }
  };

  document.addEventListener('pointerup', refocusBody);

  return () => {
    document.removeEventListener('pointerup', refocusBody);
    if (previousTabIndex === null) {
      body.removeAttribute('tabindex');
    } else {
      body.setAttribute('tabindex', previousTabIndex);
    }
  };
}

/** Sets up PWA keyboard focus when running as an installed app; no-op otherwise. */
export function setupPwaKeyboardFocusIfNeeded(): (() => void) | undefined {
  return isStandalonePwa() ? setupPwaKeyboardFocus() : undefined;
}
