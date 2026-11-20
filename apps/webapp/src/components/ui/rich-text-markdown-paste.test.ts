import { describe, expect, it } from 'vitest';

import { isPlainTextEquivalentHtml, looksLikeMarkdownDocument } from './rich-text-markdown-paste';
import { RELEASE_NOTES_MD } from './rich-text-markdown-paste.fixtures';

describe('looksLikeMarkdownDocument', () => {
  it.each([
    ['heading followed by body text', '# Heading\n\nBody text.'],
    ['bold', 'Some **bold** text'],
    ['italic', 'an *italic* word'],
    ['strikethrough', 'a ~~gone~~ word'],
    ['inline code', 'use `code` here'],
    ['link', 'see [docs](https://example.com)'],
    ['bullet list', '- item'],
    ['bullet list only', '- one\n- two'],
    ['task list', '* [ ] task'],
    ['ordered list', '1. first'],
    ['ordered list only', '1. one\n2. two'],
    ['blockquote', '> quoted'],
    ['fenced code', '```ts\ncode\n```'],
    ['horizontal rule', '---'],
    ['CRLF document', '# Title\r\n\r\nbody'],
    ['representative document', RELEASE_NOTES_MD],
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
    ['lone shell comment', '# install deps'],
    [
      'shell snippet with a comment',
      '# install deps\npip install -r requirements.txt\npython main.py',
    ],
    ['python snippet with a comment', '# compute total\ntotal = sum(values)\nprint(total)'],
    ['YAML list of key: value lines', '- name: web\n- version: 1.2.0'],
    ['sentence starting with a year', '2024. was a strong year'],
    ['python doctest prompt', '>>> print(1)\n1'],
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
