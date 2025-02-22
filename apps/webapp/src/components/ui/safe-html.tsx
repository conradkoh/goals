import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

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
  ALLOWED_ATTR: ['href', 'class', 'target'],
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|xxx):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

interface SafeHTMLProps extends React.HTMLAttributes<HTMLDivElement> {
  html: string;
  sanitize?: boolean; // Allow opting out of sanitization if content is pre-sanitized
}

export function SafeHTML({
  html,
  sanitize = true,
  className,
  ...props
}: SafeHTMLProps) {
  const sanitizedHTML = sanitize
    ? DOMPurify.sanitize(html, purifyConfig)
    : html;

  if (!sanitizedHTML) {
    return null;
  }

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none [&_a]:break-words [&_a]:overflow-wrap-anywhere',
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      {...props}
    />
  );
}

// Export the sanitize function for use in other components
export function sanitizeHTML(html: string): string {
  return html ? DOMPurify.sanitize(html, purifyConfig) : '';
}
