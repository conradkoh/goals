/**
 * Detection for pasted Markdown in the shared RichTextEditor.
 * Conservative: a paste counts as Markdown only when an unambiguous Markdown signal is present.
 * Plain prose such as `2 * 3 = 4`, `snake_case_name`, or `#1 priority` never matches.
 */

/** Block signals only count when they start a line. */
const BLOCK_SIGNALS: readonly RegExp[] = [
  /^ {0,3}#{1,6}[ \t]+\S/m, // "# Heading"
  /^ {0,3}(?:`{3,}|~{3,})/m, // "```ts" fenced code opener
  /^[ \t]*[-*+][ \t]+\S/m, // "- item", "* item", "- [ ] task"
  /^[ \t]*\d{1,9}[.)][ \t]+\S/m, // "1. item"
  /^ {0,3}>[ \t]?\S/m, // "> quote"
  /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/m, // "---", "* * *"
];

/** Inline marks only count when they wrap a non-space run, so `2 * 3 = 4` never matches. */
const INLINE_SIGNALS: readonly RegExp[] = [
  /\*\*(?!\s)[^*\n]+?(?<!\s)\*\*/, // **bold**
  /(?<![\w*])\*(?!\s)[^*\n]+?(?<!\s)\*(?![\w*])/, // *italic*
  /~~(?!\s)[^~\n]+?(?<!\s)~~/, // ~~strike~~
  /`[^`\n]+`/, // `code`
  /\[[^\]\n]+\]\((?:https?:\/\/|mailto:)[^)\s]+\)/, // [text](url)
];

export function looksLikeMarkdownDocument(text: string): boolean {
  const lf = text.replace(/\r\n?/g, '\n');
  return [...BLOCK_SIGNALS, ...INLINE_SIGNALS].some((signal) => signal.test(lf));
}

/**
 * True when the clipboard HTML carries no content beyond the plain text — for example a code
 * editor's syntax-highlighted copy, whose line breaks may be missing from the markup.
 * Whitespace is ignored on both sides so lost newlines do not count as a difference.
 */
export function isPlainTextEquivalentHtml(html: string, plainText: string): boolean {
  const htmlText = new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
  return withoutWhitespace(htmlText) === withoutWhitespace(plainText);
}

function withoutWhitespace(value: string): string {
  return value.replace(/\s+/g, '');
}
