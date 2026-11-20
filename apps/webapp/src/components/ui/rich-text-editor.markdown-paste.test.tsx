import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RichTextEditor } from './rich-text-editor';

vi.mock('./rich-text-editor.module.css', () => ({ default: {} }));

const RELEASE_NOTES_MD = [
  '# Release notes',
  '',
  'Some **bold**, *italic*, ~~gone~~ and `inline code` with a [docs link](https://example.com/docs).',
  '',
  '## Steps',
  '',
  '- first item',
  '  - nested item',
  '',
  '1. ordered one',
  '2. ordered two',
  '',
  '- [ ] open task',
  '- [x] done task',
  '',
  '> A quoted line',
  '',
  '```ts',
  'const answer = 42;',
  '```',
  '',
  '---',
  '',
  'Last paragraph.',
].join('\n');

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
});
