import DOMPurify from 'dompurify';
import { useMemo } from 'react';

import styles from './rich-text-editor.module.css';

import { cn, truncateUrlMiddle } from '@/lib/utils';

// Configure DOMPurify to only allow specific tags and attributes
const purifyConfig = {
  ALLOWED_TAGS: [
    // Basic text formatting
    'p',
    'b',
    'i',
    'u',
    'strong',
    'em',
    'strike',
    'br',
    // Lists
    'ul',
    'ol',
    'li',
    // Task list elements
    'label',
    'input',
    // Headers
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    // Other elements
    'blockquote',
    'pre',
    'code',
    'span',
    'a',
    'div',
  ],
  ALLOWED_ATTR: [
    'href',
    'class',
    'target',
    'data-type',
    'data-checked',
    'type',
    'checked',
    'title',
  ],
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|xxx):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
};

/**
 * Processes HTML to truncate long URLs in link text.
 * Only truncates links where the text content is a URL (matches the href).
 * Adds a title attribute with the full URL for hover tooltip.
 *
 * @param html - The HTML string to process
 * @param maxLength - Maximum URL length before truncation
 * @returns Processed HTML with truncated URL text
 */
function processLinksInHtml(html: string, maxLength = 60): string {
  // Use a temporary DOM parser to process links
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const links = doc.querySelectorAll('a');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    const textContent = link.textContent?.trim() || '';

    // Only process if the link text looks like a URL
    // (i.e., the text is the same as or similar to the href)
    if (href && textContent && isTextUrl(textContent)) {
      // Add title for full URL tooltip
      if (!link.getAttribute('title')) {
        link.setAttribute('title', textContent);
      }

      // Truncate the displayed text
      const truncatedText = truncateUrlMiddle(textContent, maxLength);
      if (truncatedText !== textContent) {
        link.textContent = truncatedText;
      }
    }
  });

  return doc.body.innerHTML;
}

/**
 * Checks if text looks like a URL (starts with http/https or www.)
 */
function isTextUrl(text: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(text);
}

interface SafeHTMLProps extends React.HTMLAttributes<HTMLDivElement> {
  html: string;
  sanitize?: boolean; // Allow opting out of sanitization if content is pre-sanitized
  /** Maximum URL length before truncation in links. Default: 60 */
  urlMaxLength?: number;
}

export function SafeHTML({
  html,
  sanitize = true,
  className,
  urlMaxLength = 60,
  ...props
}: SafeHTMLProps) {
  const processedHTML = useMemo(() => {
    const sanitizedHTML = sanitize ? DOMPurify.sanitize(html, purifyConfig) : html;
    if (!sanitizedHTML) return '';
    return processLinksInHtml(sanitizedHTML, urlMaxLength);
  }, [html, sanitize, urlMaxLength]);

  if (!processedHTML) {
    return null;
  }

  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none break-words overflow-wrap-anywhere',
        styles.prose,
        className
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized using DOMPurify before rendering
      dangerouslySetInnerHTML={{ __html: processedHTML }}
      {...props}
    />
  );
}

// Export the sanitize function for use in other components
export function sanitizeHTML(html: string): string {
  return html ? DOMPurify.sanitize(html, purifyConfig) : '';
}
