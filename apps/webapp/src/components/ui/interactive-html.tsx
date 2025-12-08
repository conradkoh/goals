'use client';

import DOMPurify from 'dompurify';
import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import styles from './rich-text-editor.module.css';

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
  ALLOWED_ATTR: ['href', 'class', 'target', 'data-type', 'data-checked', 'type', 'checked'],
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|xxx):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
};

interface InteractiveHTMLProps extends React.HTMLAttributes<HTMLDivElement> {
  html: string;
  sanitize?: boolean; // Allow opting out of sanitization if content is pre-sanitized
  onContentChange?: (newHtml: string) => void; // Callback when task items are toggled
  readOnly?: boolean; // If true, checkboxes are disabled
}

/**
 * Synchronizes checkbox states with data-checked attributes.
 * Tiptap renders checkboxes but doesn't automatically sync the checked attribute
 * with the data-checked attribute in the saved HTML.
 */
function syncCheckboxStates(container: HTMLElement): void {
  const taskItems = container.querySelectorAll<HTMLLIElement>('li[data-type="taskItem"]');

  taskItems.forEach((taskItem) => {
    const dataChecked = taskItem.getAttribute('data-checked') === 'true';
    const checkbox = taskItem.querySelector<HTMLInputElement>('input[type="checkbox"]');

    if (checkbox) {
      checkbox.checked = dataChecked;
    }
  });
}

/**
 * Extracts clean HTML for persistence, ensuring data-checked attributes match checkbox states.
 */
function extractCleanHTML(container: HTMLElement): string {
  // Clone the container to avoid modifying the original
  const clone = container.cloneNode(true) as HTMLElement;

  // Sync all data-checked attributes with current checkbox states
  const taskItems = clone.querySelectorAll<HTMLLIElement>('li[data-type="taskItem"]');
  taskItems.forEach((taskItem) => {
    const checkbox = taskItem.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (checkbox) {
      taskItem.setAttribute('data-checked', String(checkbox.checked));
    }
  });

  return clone.innerHTML;
}

/**
 * Interactive HTML renderer that supports checkable task lists.
 * Similar to SafeHTML but allows user interaction with task list checkboxes.
 *
 * Handles Tiptap's task list HTML structure where checkboxes are wrapped in labels.
 * Syncs checkbox states with data-checked attributes for persistence.
 *
 * @example
 * ```tsx
 * <InteractiveHTML
 *   html="<ul data-type='taskList'>...</ul>"
 *   onContentChange={(newHtml) => saveGoalDetails(newHtml)}
 * />
 * ```
 */
export function InteractiveHTML({
  html,
  sanitize = true,
  className,
  onContentChange,
  readOnly = false,
  ...props
}: InteractiveHTMLProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const htmlRef = useRef(html);
  const sanitizedHTML = sanitize ? DOMPurify.sanitize(html, purifyConfig) : html;

  // Update ref when html prop changes
  useEffect(() => {
    htmlRef.current = html;
  }, [html]);

  // Handle checkbox changes - using direct DOM manipulation to avoid re-renders
  const handleChange = useCallback(
    (event: Event) => {
      if (readOnly) {
        event.preventDefault();
        return;
      }

      const target = event.target as HTMLElement;

      // Check if we changed a task checkbox
      if (target.tagName === 'INPUT' && target instanceof HTMLInputElement) {
        const checkbox = target;
        const taskItem = checkbox.closest('li[data-type="taskItem"]');

        if (taskItem) {
          // Update the data-checked attribute
          const newCheckedState = checkbox.checked;
          taskItem.setAttribute('data-checked', String(newCheckedState));

          // Extract clean HTML for persistence
          if (onContentChange && containerRef.current) {
            const cleanHtml = extractCleanHTML(containerRef.current);
            // Store the new HTML in ref (don't trigger re-render)
            htmlRef.current = cleanHtml;
            // Notify parent of the change
            onContentChange(cleanHtml);
          }
        }
      }
    },
    [readOnly, onContentChange]
  );

  // Re-sync checkboxes whenever HTML content changes
  useEffect(() => {
    if (!containerRef.current) return;
    syncCheckboxStates(containerRef.current);
  });

  // Sync checkboxes and set up event listeners after render
  useEffect(() => {
    if (!containerRef.current) return;

    // Sync checkbox states with data-checked attributes
    syncCheckboxStates(containerRef.current);

    // Apply read-only state to checkboxes
    if (readOnly) {
      const checkboxes =
        containerRef.current.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
      checkboxes.forEach((cb) => {
        cb.disabled = true;
      });
    }

    // Add change event listener (using 'change' instead of 'click' for better checkbox handling)
    const container = containerRef.current;
    container.addEventListener('change', handleChange);

    return () => {
      container.removeEventListener('change', handleChange);
    };
  }, [readOnly, handleChange]);

  if (!sanitizedHTML) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'prose prose-sm max-w-none break-words overflow-wrap-anywhere',
        styles.prose,
        className
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized using DOMPurify before rendering
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      {...props}
    />
  );
}

// Export the sanitize function for use in other components
export function sanitizeHTML(html: string): string {
  return html ? DOMPurify.sanitize(html, purifyConfig) : '';
}
