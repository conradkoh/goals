import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncates a URL in the middle, preserving the domain and the last path component/query params.
 * Shows: protocol://domain/.../{lastPathComponent}?query
 *
 * @param url - The URL to truncate
 * @param maxLength - Maximum length before truncation (default: 60)
 * @returns Truncated URL with ellipsis in the middle, or original if short enough
 *
 * @example
 * truncateUrlMiddle("https://example.com/a/b/c/d/page?id=123", 50)
 * // Returns: "https://example.com/…/page?id=123"
 */
export function truncateUrlMiddle(url: string, maxLength = 60): string {
  // If the URL is short enough, return it as-is
  if (url.length <= maxLength) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol; // "https:"
    const host = urlObj.host; // "example.com"
    const pathname = urlObj.pathname; // "/a/b/c/d/page"
    const search = urlObj.search; // "?query=value"
    const hash = urlObj.hash; // "#anchor"

    // Get the last path component
    const pathParts = pathname.split('/').filter(Boolean);
    const lastPathComponent = pathParts.length > 0 ? pathParts[pathParts.length - 1] : '';

    // Build the ending part (last path component + query + hash)
    const endPart = lastPathComponent + search + hash;

    // Build the start part (protocol + host + slash)
    const startPart = `${protocol}//${host}/`;

    // Calculate available space for the ending
    // We need: startPart + "…/" + endPart
    const ellipsis = '…/';
    const truncated = startPart + ellipsis + endPart;

    // If even the truncated version is too long, just let it wrap naturally
    // This handles the case where the last path component itself is very long
    if (truncated.length > maxLength * 1.5) {
      // For very long endings, show start + ellipsis + last N chars
      const availableForEnd = maxLength - startPart.length - 1; // -1 for ellipsis
      if (availableForEnd > 20) {
        const endSlice = url.slice(-availableForEnd);
        return startPart + '…' + endSlice;
      }
      // If still too constrained, return with simple middle truncation
      const halfMax = Math.floor((maxLength - 1) / 2);
      return url.slice(0, halfMax) + '…' + url.slice(-halfMax);
    }

    return truncated;
  } catch {
    // If URL parsing fails, fall back to simple middle truncation
    const halfMax = Math.floor((maxLength - 1) / 2);
    return url.slice(0, halfMax) + '…' + url.slice(-halfMax);
  }
}

/**
 * Generate a UUID v4 that works in all browsers
 * Fallback for browsers that don't support crypto.randomUUID
 */
export function generateUUID(): string {
  // Use crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if randomUUID throws an error
      console.warn('crypto.randomUUID failed, using fallback', e);
    }
  }

  // Fallback implementation for browsers without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
