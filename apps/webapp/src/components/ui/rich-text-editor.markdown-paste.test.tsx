import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

function setup(html = '') {
  const { container } = render(<RichTextEditor value={html} onChange={() => {}} />);
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
});
