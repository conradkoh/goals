/**
 * Detection for pasted Markdown in the shared RichTextEditor.
 * Conservative: a paste counts as Markdown only when an unambiguous Markdown signal is present.
 * Plain prose such as `2 * 3 = 4`, `snake_case_name`, or `#1 priority` never matches.
 * Code-like text (shell or Python comments, YAML `- key: value` lists, `>>>` prompts) never matches.
 */

/**
 * A GFM table delimiter row such as `| --- | :---: |` or `--- | ---`. A delimiter row marks a
 * table, which is kept literal (one paragraph per row) because the converter has no table node.
 */
const GFM_TABLE_DELIMITER =
  /^(?=[ \t|:-]*\|)(?=[ \t|:-]*-)[ \t]*\|?[ \t]*:?-+:?(?:[ \t]*\|[ \t]*:?-+:?)*[ \t]*\|?[ \t]*$/m;

/** A block-start line. A GFM table body ends at one, even without a blank line between them. */
const BLOCK_START_ENDS_TABLE = /^ {0,3}(?:#{1,6}[ \t]|`{3,}|~{3,}|>|[-*+][ \t]|\d{1,9}[.)][ \t])/;

/** A fence opener. Group 1 is the fence run, such as ``` or ~~~. */
const FENCE_OPENER = /^ {0,3}(`{3,}|~{3,})/;

/** A line that closes an open fence: the same fence character, at least as long as the opener. */
function closesFence(line: string, opener: string): boolean {
  const match = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
  return match !== null && match[1][0] === opener[0] && match[1].length >= opener.length;
}

/** A table header is a line with a pipe, followed by a GFM delimiter row. */
function startsTable(lines: readonly string[], index: number): boolean {
  const next = lines[index + 1];
  return (
    next !== undefined &&
    lines[index].includes('|') &&
    !BLOCK_START_ENDS_TABLE.test(lines[index]) &&
    GFM_TABLE_DELIMITER.test(next)
  );
}

/** One run of a Markdown document: prose to convert, or a GFM table to keep literal. */
export type MarkdownChunk = { kind: 'markdown' | 'table'; text: string };

/**
 * Splits a Markdown document into prose and GFM table chunks. Lines are joined with `\n`, and
 * a prose chunk that is only whitespace is dropped. Input line endings are normalized.
 */
export function splitMarkdownTables(markdown: string): MarkdownChunk[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const chunks: MarkdownChunk[] = [];
  let prose: string[] = [];
  let fence: string | null = null;

  const endProse = () => {
    const text = prose.join('\n');
    if (text.trim()) chunks.push({ kind: 'markdown', text });
    prose = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (fence !== null) {
      if (closesFence(line, fence)) fence = null;
      prose.push(line);
      continue;
    }
    const opener = FENCE_OPENER.exec(line);
    if (opener) {
      fence = opener[1];
      prose.push(line);
      continue;
    }
    if (startsTable(lines, i)) {
      let end = i + 2; // header and delimiter row
      while (
        end < lines.length &&
        lines[end].trim() !== '' &&
        !BLOCK_START_ENDS_TABLE.test(lines[end])
      ) {
        end++;
      }
      endProse();
      chunks.push({ kind: 'table', text: lines.slice(i, end).join('\n') });
      i = end - 1;
      continue;
    }
    prose.push(line);
  }
  endProse();
  return chunks;
}

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

/** Stands in for each table when the detector reads the document. A bare word matches no signal. */
const TABLE_PLACEHOLDER = 'table';

export function looksLikeMarkdownDocument(text: string): boolean {
  const lf = text.replace(/\r\n?/g, '\n');
  // Each table becomes a neutral word, so a heading or bold line beside a table still counts,
  // and a document that is only a table does not.
  const signalText = splitMarkdownTables(lf)
    .map((chunk) => (chunk.kind === 'table' ? TABLE_PLACEHOLDER : chunk.text))
    .join('\n');
  return [...BLOCK_SIGNALS, ...INLINE_SIGNALS].some((signal) => signal.test(signalText));
}

/**
 * Elements that make pasted HTML rich. A Markdown conversion of the plain text would drop their
 * structure or emphasis, so such HTML keeps its own markup. Wrappers such as `div`, `span`, `p`,
 * `br`, and `code` do not count: a code editor's syntax-highlighted copy is built from them and
 * must still convert.
 */
const STRUCTURAL_HTML_SELECTOR = [
  'a[href]',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'table',
  'img',
  'strong',
  'em',
  'b',
  'i',
].join(', ');

/**
 * True when the clipboard HTML is only a wrapper around the plain text: it carries no structural
 * element, and its visible text matches the plain text. A code editor's syntax-highlighted copy
 * qualifies even when its line breaks are missing from the markup. Whitespace is ignored on both
 * sides so lost newlines do not count as a difference.
 */
export function isPlainTextEquivalentHtml(html: string, plainText: string): boolean {
  const { body } = new DOMParser().parseFromString(html, 'text/html');
  if (body.querySelector(STRUCTURAL_HTML_SELECTOR)) return false;
  return withoutWhitespace(body.textContent ?? '') === withoutWhitespace(plainText);
}

function withoutWhitespace(value: string): string {
  return value.replace(/\s+/g, '');
}
