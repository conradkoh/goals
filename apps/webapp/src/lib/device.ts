/**
 * Device detection utilities for drag-and-drop and touch interactions.
 */

/**
 * Detects if the current device has touch capabilities.
 * Used to hide drag handles on touch devices to avoid UX issues.
 *
 * @returns true if the device supports touch, false otherwise
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Detects if the current device is likely a mobile device.
 * Uses user agent detection as a fallback.
 *
 * @returns true if the device is likely mobile, false otherwise
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}
