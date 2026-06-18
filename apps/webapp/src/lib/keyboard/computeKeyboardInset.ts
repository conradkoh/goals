/** Minimal shape of the parts of VisualViewport we depend on. */
export interface VisualViewportSnapshot {
  height: number;
  offsetTop: number;
}

/**
 * Computes the keyboard overlap (in CSS px) at the bottom of the layout viewport.
 *
 * On mobile, when the on-screen keyboard opens, `window.visualViewport` shrinks
 * while the layout viewport (`window.innerHeight`) stays the same. The overlap is
 * the layout height minus the visible area (visual height + how far the visual
 * viewport is offset from the top).
 *
 * Returns 0 when there is no overlap or inputs are unavailable. A small threshold
 * avoids treating sub-pixel rounding or browser chrome jitter as a keyboard.
 */
// fallow-ignore-next-line complexity
export function computeKeyboardInset(
  viewport: VisualViewportSnapshot | null | undefined,
  layoutViewportHeight: number
): number {
  if (!viewport || !Number.isFinite(layoutViewportHeight)) {
    return 0;
  }

  const visibleBottom = viewport.height + viewport.offsetTop;
  const overlap = layoutViewportHeight - visibleBottom;

  // Ignore tiny overlaps (rounding / browser UI), treat anything meaningful as keyboard.
  if (!Number.isFinite(overlap) || overlap < 1) {
    return 0;
  }

  return Math.round(overlap);
}
