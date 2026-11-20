import { act, fireEvent, render } from '@testing-library/react';
import { MarkdownManager } from '@tiptap/markdown';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RichTextEditor } from './rich-text-editor';
import { RELEASE_NOTES_MD } from './rich-text-markdown-paste.fixtures';

vi.mock('./rich-text-editor.module.css', () => ({ default: {} }));

/**
 * jsdom has no layout engine, so it omits the range geometry ProseMirror asks for while scrolling
 * a selection into view. Empty client rects plus a zero bounding rect keep that code on its
 * no-layout path instead of throwing.
 */
const zeroRect = () =>
  ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }) as DOMRect;

Object.assign(Range.prototype, {
  getClientRects: () => [] as unknown as DOMRectList,
  getBoundingClientRect: zeroRect,
});

function setup(html = '', onChange: (value: string) => void = () => {}) {
  const { container } = render(<RichTextEditor value={html} onChange={onChange} />);
  const dom = container.querySelector('.ProseMirror') as HTMLElement;
  return { dom };
}

/**
 * Fires a paste at the editor DOM the way a browser would. jsdom's ClipboardEvent
 * ignores the `clipboardData` init, so the payload is attached explicitly.
 */
function paste(dom: HTMLElement, data: { text: string; html?: string }) {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', {
    value: {
      getData: (type: string) =>
        type === 'text/plain' ? data.text : type === 'text/html' ? (data.html ?? '') : '',
    },
  });
  act(() => {
    fireEvent(dom, event);
  });
}

describe('RichTextEditor Markdown paste', () => {
  it('converts a Markdown document into rich text', () => {
    const { dom } = setup();
    paste(dom, { text: RELEASE_NOTES_MD });

    // No empty paragraph is left before the first converted block.
    expect(dom.firstElementChild?.tagName).toBe('H1');
    expect(dom.firstElementChild?.textContent).toBe('Release notes');

    const h2 = dom.querySelector('h2');
    expect(h2?.textContent).toBe('Steps');

    expect(dom.querySelector('strong')?.textContent).toBe('bold');
    expect(dom.querySelector('em')?.textContent).toBe('italic');
    expect(dom.querySelector('s')?.textContent).toBe('gone');

    const inlineCode = Array.from(dom.querySelectorAll('code')).find((el) => !el.closest('pre'));
    expect(inlineCode?.textContent).toBe('inline code');

    const link = dom.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://example.com/docs');
    expect(link?.textContent).toBe('docs link');

    const topLevelBulletLists = Array.from(dom.children).filter(
      (el) => el.tagName === 'UL' && el.getAttribute('data-type') !== 'taskList'
    );
    expect(topLevelBulletLists).toHaveLength(1);
    const firstBulletItem = topLevelBulletLists[0]?.querySelector('li');
    expect(firstBulletItem?.querySelector('ul li')?.textContent).toBe('nested item');

    const orderedItems = Array.from(dom.querySelectorAll('ol > li'));
    expect(orderedItems.map((item) => item.textContent)).toEqual(['ordered one', 'ordered two']);

    const taskList = dom.querySelector('ul[data-type="taskList"]');
    // Task items render through a NodeView that omits `data-type`, so scope by list instead.
    const taskItems = Array.from(taskList?.querySelectorAll(':scope > li') ?? []);
    expect(taskItems).toHaveLength(2);
    expect(taskItems.map((item) => item.getAttribute('data-checked'))).toEqual(['false', 'true']);
    expect(taskItems.map((item) => item.querySelector('p')?.textContent)).toEqual([
      'open task',
      'done task',
    ]);

    expect(dom.querySelector('blockquote')?.textContent).toBe('A quoted line');
    expect(dom.querySelector('pre code')?.textContent).toBe('const answer = 42;');
    expect(dom.querySelectorAll('hr')).toHaveLength(1);

    const paragraphs = Array.from(dom.querySelectorAll('p'));
    expect(paragraphs.at(-1)?.textContent).toBe('Last paragraph.');

    const text = dom.textContent ?? '';
    expect(text).not.toContain('**');
    expect(text).not.toContain('~~');
    expect(text).not.toContain('`');
    expect(text).not.toContain('](');
    expect(text).not.toContain('# ');
    expect(text).not.toMatch(/^\s*- \[/m);
  });

  it('leaves ordinary prose as plain text', () => {
    const { dom } = setup();
    paste(dom, { text: '2 * 3 = 4\nsnake_case and #1 priority' });

    expect(dom.querySelector('ul')).toBeNull();
    expect(dom.querySelector('ol')).toBeNull();
    expect(dom.querySelector('h1')).toBeNull();
    expect(dom.querySelector('h2')).toBeNull();
    expect(dom.querySelector('strong')).toBeNull();
    expect(dom.querySelector('em')).toBeNull();
    expect(dom.querySelector('blockquote')).toBeNull();
    expect(dom.querySelector('pre')).toBeNull();
    expect(dom.querySelector('hr')).toBeNull();

    const text = dom.textContent ?? '';
    expect(text).toContain('2 * 3 = 4');
    expect(text).toContain('snake_case and #1 priority');
  });

  it.each([
    [
      'shell snippet',
      '# install deps\npip install -r requirements.txt\npython main.py',
      'pip install -r requirements.txt',
    ],
    ['YAML list', '- name: web\n- version: 1.2.0', 'version: 1.2.0'],
    ['sentence starting with a year', '2024. was a strong year', '2024. was a strong year'],
  ])('keeps %s as literal text', (_label, text, visibleLine) => {
    const { dom } = setup();
    paste(dom, { text });

    expect(dom.querySelector('h1')).toBeNull();
    expect(dom.querySelector('ul')).toBeNull();
    expect(dom.querySelector('ol')).toBeNull();
    expect(dom.querySelector('pre')).toBeNull();
    expect(dom.textContent).toContain(visibleLine);
  });
});

/**
 * Places a DOM selection over the first occurrence of `text` in the editor. ProseMirror mirrors
 * the DOM selection into its state on `selectionchange`. With `collapse`, the caret goes to the
 * start of `text` instead of selecting it.
 */
function selectText(dom: HTMLElement, text: string, collapse = false) {
  const walker = document.createTreeWalker(dom, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const start = node.textContent?.indexOf(text) ?? -1;
    if (start === -1) continue;
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, collapse ? start : start + text.length);
    act(() => {
      dom.focus();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });
    return;
  }
  throw new Error(`Text not found in editor: ${text}`);
}

/**
 * Places a collapsed DOM selection inside the `index`th paragraph. An empty paragraph has no text
 * node to anchor on, so `selectText` cannot place the caret there.
 */
function placeCaretInParagraph(dom: HTMLElement, index: number) {
  const paragraph = dom.querySelectorAll('p')[index];
  const range = document.createRange();
  range.setStart(paragraph, 0);
  range.collapse(true);
  act(() => {
    dom.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
}

describe('RichTextEditor paste preservation', () => {
  it('keeps formatting from a rich HTML paste', () => {
    const { dom } = setup();
    paste(dom, {
      text: '# Title\n\n- item',
      // The emphasis only exists in the HTML, so a Markdown conversion of the plain text would lose it.
      html: '<h1>Title</h1><ul><li><em>item</em></li></ul>',
    });

    expect(dom.querySelector('h1')?.textContent).toBe('Title');
    expect(dom.querySelector('ul > li')?.textContent).toBe('item');
    expect(dom.querySelector('ul > li em')?.textContent).toBe('item');
    expect(dom.textContent).not.toContain('# Title');
  });

  it('keeps list and emphasis markup from a rich paste whose text looks like Markdown', () => {
    const { dom } = setup();
    paste(dom, {
      text: '- item',
      html: '<ul><li><em>- item</em></li></ul>',
    });

    expect(dom.querySelector('ul > li')).not.toBeNull();
    expect(dom.querySelector('ul > li em')?.textContent).toBe('- item');
  });

  it('converts a VS Code highlighted copy of Markdown into rich text', () => {
    const { dom } = setup();
    paste(dom, {
      text: '# Heading\n\nbody',
      html: '<div><span style="color: #569cd6"># Heading</span></div><div><span>body</span></div>',
    });

    expect(dom.querySelector('h1')?.textContent).toBe('Heading');
    expect(dom.textContent).not.toContain('# Heading');
  });

  it('turns a pasted URL into a link over the selected text', () => {
    const { dom } = setup('<p>docs</p>');
    selectText(dom, 'docs');
    paste(dom, { text: 'https://example.com/docs' });

    const link = dom.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://example.com/docs');
    expect(link?.textContent).toBe('docs');
  });

  it('inserts Markdown-looking text literally inside a code block', () => {
    const { dom } = setup('<pre><code>const x = 1;</code></pre>');
    selectText(dom, 'const x', true);
    paste(dom, { text: '# not a heading\n- not a list' });

    expect(dom.querySelector('h1')).toBeNull();
    expect(dom.querySelector('ul')).toBeNull();
    expect(dom.querySelector('pre code')?.textContent).toContain('# not a heading');
  });

  it('undoes a whole Markdown paste in one step', () => {
    const { dom } = setup();
    paste(dom, { text: RELEASE_NOTES_MD });
    expect(dom.querySelector('h1')).not.toBeNull();

    // jsdom's navigator.platform is not a Mac, so ProseMirror's Mod-z is Ctrl-z here.
    act(() => {
      fireEvent.keyDown(dom, { key: 'z', ctrlKey: true });
    });

    expect(dom.querySelector('h1')).toBeNull();
    expect(dom.querySelector('h2')).toBeNull();
    expect(dom.querySelector('ul, ol, pre, blockquote, hr, strong, em, s, a')).toBeNull();
    expect(dom.textContent).toBe('');
  });

  it('keeps a table literal while converting the Markdown around it', () => {
    const { dom } = setup();
    paste(dom, { text: '**Status**\n\n| Name | Count |\n| --- | --- |\n| alpha | 1 |' });

    expect(dom.querySelector('strong')?.textContent).toBe('Status');
    expect(paragraphTexts(dom)).toEqual([
      'Status',
      '| Name | Count |',
      '| --- | --- |',
      '| alpha | 1 |',
    ]);
  });

  it('keeps a table-only paste literal with no converted block', () => {
    const { dom } = setup();
    paste(dom, { text: '| **Name** | Count |\n| --- | --- |\n| alpha | 1 |' });

    expect(paragraphTexts(dom)).toEqual(['| **Name** | Count |', '| --- | --- |', '| alpha | 1 |']);
    expect(dom.querySelector('strong')).toBeNull();
    expect(dom.querySelector('ul, ol, h1, h2, h3, blockquote')).toBeNull();
  });

  it('keeps the blocks around a table in document order', () => {
    const { dom } = setup();
    paste(dom, {
      text: [
        '# Title',
        '',
        '- first',
        '- second',
        '',
        'Some **bold** text.',
        '',
        '| alpha | 1 |',
        '| --- | --- |',
        '| beta | 2 |',
        '',
        '## After',
        '',
        'Final paragraph.',
      ].join('\n'),
    });

    expect(Array.from(dom.children).map((el) => el.tagName)).toEqual([
      'H1',
      'UL',
      'P',
      'P',
      'P',
      'P',
      'H2',
      'P',
    ]);
    expect(dom.querySelector('h1')?.textContent).toBe('Title');
    expect(Array.from(dom.querySelectorAll('ul > li')).map((li) => li.textContent)).toEqual([
      'first',
      'second',
    ]);
    expect(dom.querySelector('p strong')?.textContent).toBe('bold');
    expect(dom.querySelector('h2')?.textContent).toBe('After');
    expect(paragraphTexts(dom)).toEqual([
      'first',
      'second',
      'Some bold text.',
      '| alpha | 1 |',
      '| --- | --- |',
      '| beta | 2 |',
      'Final paragraph.',
    ]);
  });
});

function paragraphTexts(dom: HTMLElement): (string | null)[] {
  return Array.from(dom.querySelectorAll('p')).map((p) => p.textContent);
}

describe('RichTextEditor paste position', () => {
  it('joins multi-line plain text at the caret', () => {
    const { dom } = setup('<p>abcdef</p>');
    selectText(dom, 'def', true); // caret: abc|def
    paste(dom, { text: 'foo\nbar' });
    expect(paragraphTexts(dom)).toEqual(['abcfoo', 'bardef']);
  });

  it('adds no empty paragraph for a trailing newline', () => {
    const { dom } = setup();
    paste(dom, { text: 'first line\nsecond line\n' });
    expect(paragraphTexts(dom)).toEqual(['first line', 'second line']);
  });

  it('inserts a single line with a trailing newline inline', () => {
    // The editor serializes paragraphs with this class, so this is what the app stores as `value`.
    const { dom } = setup('<p class="leading-normal">abc</p>');
    selectText(dom, 'abc', true); // caret: |abc
    paste(dom, { text: 'foo\n' });
    expect(paragraphTexts(dom)).toEqual(['fooabc']);
  });

  it('replaces only the selected text with a multi-line paste', () => {
    const { dom } = setup('<p>abcdef</p>');
    selectText(dom, 'cde'); // selects cde
    paste(dom, { text: 'foo\nbar' });
    expect(paragraphTexts(dom)).toEqual(['abfoo', 'barf']);
  });

  it('keeps a single-line Markdown paste inline in its paragraph', () => {
    const { dom } = setup('<p>abc def</p>');
    selectText(dom, 'def', true); // caret: abc |def
    paste(dom, { text: 'some **bold** word' });
    expect(paragraphTexts(dom)).toEqual(['abc some bold worddef']);
    expect(dom.querySelector('p strong')?.textContent).toBe('bold');
  });

  it('leaves the caret at the end of a Markdown paste that replaces an empty paragraph', () => {
    const { dom } = setup('<p>a</p><p></p><p>b</p>');
    expect(paragraphTexts(dom)).toEqual(['a', '', 'b']);
    placeCaretInParagraph(dom, 1); // caret in the empty middle paragraph
    paste(dom, { text: '# H\n\ntext' });

    expect(dom.querySelector('h1')?.textContent).toBe('H');
    expect(paragraphTexts(dom)).toEqual(['a', 'text', 'b']);

    // Assert the selection itself: the caret must be after "text", not at the start of "b".
    const selection = window.getSelection();
    expect(selection?.isCollapsed).toBe(true);
    expect(selection?.anchorNode?.textContent).toBe('text');
    expect(selection?.anchorOffset).toBe(4);
  });

  it('splits a paragraph at a Markdown heading and joins the last paragraph to the text after the caret', () => {
    const { dom } = setup('<p>abcdef</p>');
    selectText(dom, 'def', true); // caret: abc|def
    paste(dom, { text: '# Heading\n\n- item one\n- item two\n\nTail' });

    expect(Array.from(dom.children).map((el) => el.tagName)).toEqual(['P', 'H1', 'UL', 'P']);
    expect(dom.firstElementChild?.textContent).toBe('abc');
    expect(dom.querySelector('h1')?.textContent).toBe('Heading');
    expect(Array.from(dom.querySelectorAll('ul > li')).map((li) => li.textContent)).toEqual([
      'item one',
      'item two',
    ]);
    expect(dom.lastElementChild?.textContent).toBe('Taildef');
  });

  it('replaces only the selected text with a Markdown list paste', () => {
    const { dom } = setup('<p>abcdef</p>');
    selectText(dom, 'cde'); // selects cde
    paste(dom, { text: '- one\n- two' });

    expect(Array.from(dom.children).map((el) => el.tagName)).toEqual(['P', 'UL', 'P']);
    expect(dom.firstElementChild?.textContent).toBe('ab');
    expect(Array.from(dom.querySelectorAll('ul > li')).map((li) => li.textContent)).toEqual([
      'one',
      'two',
    ]);
    expect(dom.lastElementChild?.textContent).toBe('f');
    expect(dom.textContent).not.toContain('cde');
  });
});

/** Converted, this is an `h1`. The default paste keeps the `#` as literal text, so the two outcomes differ. */
const FALLBACK_MARKDOWN = '# T\n\nbody';

function expectDefaultPasteOfFallbackText(dom: HTMLElement) {
  expect(dom.querySelector('h1')).toBeNull();
  expect(dom.textContent).toContain('# T');
  expect(dom.textContent).toContain('body');
}

describe('RichTextEditor Markdown paste fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to the default paste when the Markdown parser throws', () => {
    const parse = vi.spyOn(MarkdownManager.prototype, 'parse').mockImplementation(() => {
      throw new Error('parser failed');
    });
    const { dom } = setup();
    expect(() => paste(dom, { text: FALLBACK_MARKDOWN })).not.toThrow();
    expect(parse).toHaveBeenCalled();
    expectDefaultPasteOfFallbackText(dom);
  });

  it('falls back to the default paste when the parser returns a node the schema does not know', () => {
    const parse = vi.spyOn(MarkdownManager.prototype, 'parse').mockReturnValue({
      type: 'doc',
      content: [{ type: 'unknownBlock' }],
    } as ReturnType<MarkdownManager['parse']>);
    const { dom } = setup();
    expect(() => paste(dom, { text: FALLBACK_MARKDOWN })).not.toThrow();
    expect(parse).toHaveBeenCalled();
    expectDefaultPasteOfFallbackText(dom);
  });
});

describe('RichTextEditor Markdown paste safety', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const UNSAFE_MARKDOWN: Record<string, string> = {
    'raw script': '**Note**\n\n<script>alert(1)</script>',
    'escaped script': '**Note**\n\n&lt;script&gt;alert(1)&lt;/script&gt;',
    'img onerror': '**Note**\n\nsee <img src=x onerror=alert(1)>',
    'javascript link': '**Note**\n\n[x](javascript:alert(1))',
  };

  function expectNoActiveMarkupInDom(dom: HTMLElement) {
    expect(dom.querySelector('script')).toBeNull();
    expect(dom.querySelector('img')).toBeNull();
    expect(dom.querySelector('[onerror]')).toBeNull();
    for (const link of Array.from(dom.querySelectorAll('a'))) {
      expect(link.getAttribute('href') ?? '').not.toMatch(/javascript:/i);
    }
  }

  function expectNoActiveMarkupInHtml(html: string) {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toMatch(/javascript:/i);
  }

  it.each(Object.entries(UNSAFE_MARKDOWN))(
    'pastes %s Markdown without active markup',
    (_name, text) => {
      const onChange = vi.fn();
      const { dom } = setup('', onChange);
      expect(() => paste(dom, { text })).not.toThrow();
      expect(dom.textContent).toContain('Note');
      expectNoActiveMarkupInDom(dom);
      // Assert the callback ran, so the HTML check cannot pass vacuously.
      expect(onChange).toHaveBeenCalled();
      expectNoActiveMarkupInHtml(onChange.mock.calls.at(-1)?.[0] as string);
    }
  );
});
