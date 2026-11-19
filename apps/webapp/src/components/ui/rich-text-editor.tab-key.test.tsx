import { act, fireEvent, render } from '@testing-library/react';
import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { describe, expect, it, vi } from 'vitest';

import { RichTextEditor } from './rich-text-editor';

vi.mock('./rich-text-editor.module.css', () => ({ default: {} }));

/** Finds the text position (in the first occurrence) of `text` plus an offset. */
function posOf(editor: Editor, text: string, offset: number): number {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found === -1 && node.isText && node.text === text) found = pos + offset;
  });
  if (found === -1) throw new Error(`text not found: ${text}`);
  return found;
}

function setup(html: string) {
  const { container } = render(
    <div>
      <button type="button">before</button>
      <RichTextEditor value={html} onChange={() => {}} autoFocus />
      <button type="button">after</button>
    </div>
  );
  const dom = container.querySelector('.ProseMirror') as HTMLElement & { editor: Editor };
  const afterButton = container.querySelectorAll('button')[1];
  return { afterButton, dom, editor: dom.editor };
}

function selectText(editor: Editor, text: string, offset: number) {
  act(() => {
    editor.view.dispatch(
      editor.state.tr.setSelection(
        TextSelection.create(editor.state.doc, posOf(editor, text, offset))
      )
    );
  });
}

/**
 * Fires a Tab keydown at the editor DOM, as a browser would.
 *
 * Returns `true` when the event was handled (preventDefault called => the browser will not
 * move focus out of the editor). jsdom does not implement Tab focus traversal, so the
 * returned value is the assertion seam for focus behaviour.
 */
function pressTab(
  dom: HTMLElement,
  modifiers: { shift?: boolean; ctrl?: boolean; meta?: boolean; alt?: boolean } = {}
): boolean {
  let prevented = false;
  act(() => {
    // fireEvent returns false when preventDefault() was called
    prevented = !fireEvent.keyDown(dom, {
      key: 'Tab',
      code: 'Tab',
      shiftKey: modifiers.shift ?? false,
      ctrlKey: modifiers.ctrl ?? false,
      metaKey: modifiers.meta ?? false,
      altKey: modifiers.alt ?? false,
    });
  });
  return prevented;
}

const BULLET_LIST = '<ul><li><p>one</p></li><li><p>two</p></li></ul>';
const TASK_LIST =
  '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>one</p></li><li data-type="taskItem" data-checked="false"><p>two</p></li></ul>';

// Expected `editor.getHTML()` literals for each list shape, so assertions never re-run
// editor logic to derive their own expectation.
const BULLET_FLAT =
  '<ul class="list-disc ml-4 my-2"><li class="leading-normal"><p class="leading-normal">one</p></li><li class="leading-normal"><p class="leading-normal">two</p></li></ul><p class="leading-normal"></p>';
const BULLET_NESTED =
  '<ul class="list-disc ml-4 my-2"><li class="leading-normal"><p class="leading-normal">one</p><ul class="list-disc ml-4 my-2"><li class="leading-normal"><p class="leading-normal">two</p></li></ul></li></ul><p class="leading-normal"></p>';
const TASK_FLAT =
  '<ul class="task-list my-2" data-type="taskList"><li class="task-item flex gap-2" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p class="leading-normal">one</p></div></li><li class="task-item flex gap-2" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p class="leading-normal">two</p></div></li></ul><p class="leading-normal"></p>';
const TASK_NESTED =
  '<ul class="task-list my-2" data-type="taskList"><li class="task-item flex gap-2" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p class="leading-normal">one</p><ul class="task-list my-2" data-type="taskList"><li class="task-item flex gap-2" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p class="leading-normal">two</p></div></li></ul></div></li></ul><p class="leading-normal"></p>';

const lists = [
  { label: 'bullet list', input: BULLET_LIST, flat: BULLET_FLAT, nested: BULLET_NESTED },
  { label: 'task list', input: TASK_LIST, flat: TASK_FLAT, nested: TASK_NESTED },
];

const caretPositions = [
  { label: 'caret at start of item', offset: 0 },
  { label: 'caret mid-text', offset: 1 },
];

describe('RichTextEditor Tab / Shift-Tab handling', () => {
  for (const { label, input, flat, nested } of lists) {
    for (const { label: where, offset } of caretPositions) {
      it(`${label}, ${where}: Tab indents the second item and keeps focus in the editor`, () => {
        const { afterButton, dom, editor } = setup(input);
        selectText(editor, 'two', offset);

        expect(pressTab(dom)).toBe(true);
        expect(editor.getHTML()).toBe(nested);
        expect(document.activeElement).not.toBe(afterButton);
      });

      it(`${label}, ${where}: further Tabs past the deepest indent are prevented no-ops`, () => {
        const { afterButton, dom, editor } = setup(input);
        selectText(editor, 'two', offset);
        expect(pressTab(dom)).toBe(true);

        expect(pressTab(dom)).toBe(true);
        expect(pressTab(dom)).toBe(true);
        expect(editor.getHTML()).toBe(nested);
        expect(document.activeElement).not.toBe(afterButton);
      });

      it(`${label}, ${where}: Tab on the first item is prevented and leaves the document unchanged`, () => {
        const { afterButton, dom, editor } = setup(input);
        selectText(editor, 'one', offset);

        expect(pressTab(dom)).toBe(true);
        expect(editor.getHTML()).toBe(flat);
        expect(document.activeElement).not.toBe(afterButton);
      });

      it(`${label}, ${where}: Shift-Tab on a nested item outdents it`, () => {
        const { afterButton, dom, editor } = setup(input);
        selectText(editor, 'two', offset);
        expect(pressTab(dom)).toBe(true);
        expect(editor.getHTML()).toBe(nested);

        expect(pressTab(dom, { shift: true })).toBe(true);
        expect(editor.getHTML()).toBe(flat);
        expect(document.activeElement).not.toBe(afterButton);
      });
    }
  }

  it('plain paragraph: Tab is prevented and leaves the document unchanged', () => {
    const { dom, editor } = setup('<p>hello</p>');

    expect(pressTab(dom)).toBe(true);
    expect(editor.getHTML()).toBe('<p class="leading-normal">hello</p>');
  });

  it('plain paragraph: Shift-Tab is prevented and leaves the document unchanged', () => {
    const { dom, editor } = setup('<p>hello</p>');

    expect(pressTab(dom, { shift: true })).toBe(true);
    expect(editor.getHTML()).toBe('<p class="leading-normal">hello</p>');
  });

  it('bullet list: Tab with a multi-item selection that cannot indent is a prevented no-op', () => {
    const { dom, editor } = setup(BULLET_LIST);
    act(() => {
      editor.view.dispatch(
        editor.state.tr.setSelection(
          TextSelection.create(editor.state.doc, posOf(editor, 'one', 1), posOf(editor, 'two', 1))
        )
      );
    });

    expect(pressTab(dom)).toBe(true);
    expect(editor.getHTML()).toBe(BULLET_FLAT);
  });

  it('bullet list: Shift-Tab on a top-level item outdents it to a paragraph', () => {
    const { dom, editor } = setup(BULLET_LIST);
    selectText(editor, 'one', 1);

    expect(pressTab(dom, { shift: true })).toBe(true);
    expect(editor.getHTML()).toBe(
      '<p class="leading-normal">one</p><ul class="list-disc ml-4 my-2"><li class="leading-normal"><p class="leading-normal">two</p></li></ul><p class="leading-normal"></p>'
    );
  });

  it.each([
    ['Ctrl+Tab', { ctrl: true }],
    ['Meta+Tab', { meta: true }],
    ['Alt+Tab', { alt: true }],
  ])('%s is left to the operating system (not prevented)', (_label, modifiers) => {
    const { dom, editor } = setup(BULLET_LIST);
    selectText(editor, 'two', 1);

    expect(pressTab(dom, modifiers)).toBe(false);
    expect(editor.getHTML()).toBe(BULLET_FLAT);
  });
});
