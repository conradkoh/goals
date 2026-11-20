import { describe, expect, it } from 'vitest';

import { isPlainTextEquivalentHtml, looksLikeMarkdownDocument } from './rich-text-markdown-paste';

describe('looksLikeMarkdownDocument', () => {
  it.each([
    ['heading', '# Heading'],
    ['bold', 'Some **bold** text'],
    ['italic', 'an *italic* word'],
    ['strikethrough', 'a ~~gone~~ word'],
    ['inline code', 'use `code` here'],
    ['link', 'see [docs](https://example.com)'],
    ['bullet list', '- item'],
    ['task list', '* [ ] task'],
    ['ordered list', '1. first'],
    ['blockquote', '> quoted'],
    ['fenced code', '```ts\ncode\n```'],
    ['horizontal rule', '---'],
    ['CRLF document', '# Title\r\n\r\nbody'],
  ])('detects %s', (_label, input) => {
    expect(looksLikeMarkdownDocument(input)).toBe(true);
  });

  it.each([
    ['multiplication', '2 * 3 = 4'],
    ['snake_case identifiers', 'snake_case_name and file_name_2'],
    ['issue reference', 'Issue #12 is open'],
    ['number sign without space', '#1 priority'],
    ['plain prose', 'Plain sentence.'],
    ['price arithmetic', 'price 5*3 total'],
    ['isolated asterisks', 'a * b * c'],
    ['underscored URL', 'https://example.com/path_with_underscores'],
    ['empty string', ''],
  ])('rejects %s', (_label, input) => {
    expect(looksLikeMarkdownDocument(input)).toBe(false);
  });
});

describe('isPlainTextEquivalentHtml', () => {
  it('ignores inline formatting differences', () => {
    expect(isPlainTextEquivalentHtml('<p>Hello <strong>world</strong></p>', 'Hello world')).toBe(
      true
    );
  });

  it('ignores line breaks missing from the markup', () => {
    expect(
      isPlainTextEquivalentHtml('<div># Heading</div><div>- item</div>', '# Heading\n- item')
    ).toBe(true);
  });

  it('reports false when the markup carries extra visible text', () => {
    expect(isPlainTextEquivalentHtml('<ul><li>a</li></ul>', '• a')).toBe(false);
  });
});
