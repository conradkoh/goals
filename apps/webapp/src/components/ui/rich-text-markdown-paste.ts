/**
 * Detection for pasted Markdown in the shared RichTextEditor.
 * Conservative: a paste counts as Markdown only when an unambiguous Markdown signal is present.
 * Plain prose such as `2 * 3 = 4`, `snake_case_name`, or `#1 priority` never matches.
 * Code-like text (shell or Python comments, YAML `- key: value` lists, `>>>` prompts) never matches.
 */

/**
 * A GFM table delimiter row such as `| --- | :---: |` or `--- | ---`. The converter has no table
 * node, so a document with a table would lose its cells. Such documents stay plain text.
 */
const GFM_TABLE_DELIMITER =
  /^(?=[ \t|:-]*\|)(?=[ \t|:-]*-)[ \t]*\|?[ \t]*:?-+:?(?:[ \t]*\|[ \t]*:?-+:?)*[ \t]*\|?[ \t]*$/m;

/** Block signals only count when they start a line. */
const BLOCK_SIGNALS: readonly RegExp[] = [
  // "# Heading" counts only when a blank line and body text follow it. A `# comment` line in a
  // shell or Python snippet is followed by code, so it does not match.
  /^ {0,3}#{1,6}[ \t]+\S[^\n]*\n[ \t]*\n[ \t]*\S/m,
  /^ {0,3}(?:`{3,}|~{3,})/m, // "```ts" fenced code opener
  // "- item", "* item", "- [ ] task". YAML-style "- key: value" lines do not count.
  /^[ \t]*[-*+][ \t]+(?![\w.-]+:(?:[ \t]|$))\S/m,
  // "1. item". Only a list that starts at 1 counts, so "2024. was a strong year" does not.
  /^[ \t]*1[.)][ \t]+\S/m,
  // "> quote". Python ">>> " prompts do not count.
  /^ {0,3}>(?!>)[ \t]?\S/m,
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
  if (GFM_TABLE_DELIMITER.test(lf)) return false;
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
