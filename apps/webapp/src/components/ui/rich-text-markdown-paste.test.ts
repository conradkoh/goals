import { describe, expect, it } from 'vitest';

import {
  isPlainTextEquivalentHtml,
  looksLikeMarkdownDocument,
  splitMarkdownTables,
} from './rich-text-markdown-paste';
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
    ['pipe in a bullet list', '- a | b\n- c'],
    ['table after bold line', '**Status**\n\n| Name | Count |\n| --- | --- |\n| alpha | 1 |'],
    ['heading followed by a table', '# Title\n\n| a | b |\n| - | - |\n| 1 | 2 |'],
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
    ['table without outer pipes', 'a | b\n--- | ---'],
    ['table with alignment markers', '| a | b |\n|:-|-:|\n| 1 | 2 |'],
    ['table only with bold cells', '| **a** | b |\n| - | - |'],
  ])('rejects %s', (_label, input) => {
    expect(looksLikeMarkdownDocument(input)).toBe(false);
  });
});

describe('splitMarkdownTables', () => {
  it('keeps prose on either side of a table as markdown chunks', () => {
    expect(splitMarkdownTables('# Title\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\nAfter')).toEqual([
      { kind: 'markdown', text: '# Title\n' },
      { kind: 'table', text: '| a | b |\n| - | - |\n| 1 | 2 |' },
      { kind: 'markdown', text: '\nAfter' },
    ]);
  });

  it('ends a table at a block start with no blank line between', () => {
    expect(splitMarkdownTables('| a | b |\n| - | - |\n| 1 | 2 |\n# Next')).toEqual([
      { kind: 'table', text: '| a | b |\n| - | - |\n| 1 | 2 |' },
      { kind: 'markdown', text: '# Next' },
    ]);
  });

  it('returns a table-only document as one table chunk', () => {
    expect(splitMarkdownTables('| a | b |\n| - | - |')).toEqual([
      { kind: 'table', text: '| a | b |\n| - | - |' },
    ]);
  });

  it('does not split a table written inside a fenced code block', () => {
    const fenced = '```\n| a | b |\n| - | - |\n```';
    expect(splitMarkdownTables(fenced)).toEqual([{ kind: 'markdown', text: fenced }]);
  });

  it('returns no chunks for an empty document', () => {
    expect(splitMarkdownTables('')).toEqual([]);
  });
});

describe('isPlainTextEquivalentHtml', () => {
  it.each([
    ['link', '<p><a href="https://example.com/docs">**docs**</a></p>', '**docs**'],
    ['list item', '<ul><li>- item</li></ul>', '- item'],
    ['ordered list item', '<ol><li>1. first</li></ol>', '1. first'],
    ['heading', '<h1># Title</h1>', '# Title'],
    ['blockquote', '<blockquote>&gt; quoted</blockquote>', '> quoted'],
    ['preformatted block', '<pre>- item</pre>', '- item'],
    ['table cell', '<table><tr><td>- item</td></tr></table>', '- item'],
    ['image', '<p><img src="https://example.com/a.png">- item</p>', '- item'],
    ['strong', '<p><strong>**bold**</strong></p>', '**bold**'],
    ['em', '<p><em>*italic*</em></p>', '*italic*'],
    ['b', '<p><b>**bold**</b></p>', '**bold**'],
    ['i', '<p><i>*italic*</i></p>', '*italic*'],
  ])('treats %s markup as rich HTML', (_label, html, plainText) => {
    expect(isPlainTextEquivalentHtml(html, plainText)).toBe(false);
  });

  it.each([
    [
      'div and span wrappers (VS Code copy)',
      '<div><span style="color: #569cd6"># Heading</span></div><div><span>body</span></div>',
      '# Heading\n\nbody',
    ],
    ['code', '<p>Hello <code>world</code></p>', 'Hello world'],
    ['line break', '<p>Plain<br>text</p>', 'Plain\ntext'],
    ['paragraph', '<p>Hello world</p>', 'Hello world'],
  ])('keeps %s equivalent to its plain text', (_label, html, plainText) => {
    expect(isPlainTextEquivalentHtml(html, plainText)).toBe(true);
  });

  it('ignores line breaks missing from the markup', () => {
    expect(
      isPlainTextEquivalentHtml('<div># Heading</div><div>- item</div>', '# Heading\n- item')
    ).toBe(true);
  });

  it('reports false when the markup carries extra visible text', () => {
    expect(isPlainTextEquivalentHtml('<ul><li>a</li></ul>', '• a')).toBe(false);
  });

  it('treats escaped markup as text, not structure', () => {
    expect(
      isPlainTextEquivalentHtml('&lt;strong&gt;Hello&lt;/strong&gt;', '<strong>Hello</strong>')
    ).toBe(true);
  });
});
