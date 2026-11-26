import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMarkdownEditorExtensions } from './markdownEditorExtensions';

function createEditor() {
  return new Editor({ extensions: createMarkdownEditorExtensions(), content: '' });
}

function typeText(editor: Editor, text: string, keyDelayMs: number, clock: { now: number }) {
  for (const ch of text) {
    clock.now += keyDelayMs;
    editor.view.dispatch(editor.state.tr.insertText(ch));
  }
}

const plain = (editor: Editor) => editor.getText().trim();

describe('markdown editor undo granularity', () => {
  afterEach(() => vi.restoreAllMocks());

  function withClock() {
    const clock = { now: 1_000_000 };
    vi.spyOn(Date, 'now').mockImplementation(() => clock.now);
    return clock;
  }

  it('one undo after continuous typing removes only the last word', () => {
    const clock = withClock();
    const editor = createEditor();
    typeText(editor, 'alpha bravo charlie delta echo', 60, clock);
    editor.commands.undo();
    expect(plain(editor)).toBe('alpha bravo charlie delta');
  });

  it('repeated undo walks back word by word and redo replays the same groups', () => {
    const clock = withClock();
    const editor = createEditor();
    typeText(editor, 'alpha bravo charlie', 60, clock);
    editor.commands.undo();
    expect(plain(editor)).toBe('alpha bravo');
    editor.commands.undo();
    expect(plain(editor)).toBe('alpha');
    editor.commands.redo();
    expect(plain(editor)).toBe('alpha bravo');
  });

  it('pressing Enter inside continuous typing starts a new undo group', () => {
    const clock = withClock();
    const editor = createEditor();
    typeText(editor, 'alpha', 60, clock);
    clock.now += 60;
    editor.commands.splitBlock();
    typeText(editor, 'bravo', 60, clock);
    editor.commands.undo();
    expect(editor.state.doc.childCount).toBe(2);
    expect(plain(editor)).toBe('alpha');
  });

  it('a pause longer than the group delay still splits undo groups', () => {
    const clock = withClock();
    const editor = createEditor();
    for (const w of ['alpha ', 'bravo ', 'charlie']) {
      typeText(editor, w, 60, clock);
      clock.now += 800;
    }
    editor.commands.undo();
    expect(plain(editor)).toBe('alpha bravo');
  });

  it('a pause in the middle of a word still splits the undo group', () => {
    const clock = withClock();
    const editor = createEditor();
    typeText(editor, 'alp', 60, clock);
    clock.now += 800;
    typeText(editor, 'ha bravo', 60, clock);
    editor.commands.undo();
    expect(editor.getText()).toBe('alpha ');
    editor.commands.undo();
    expect(editor.getText()).toBe('alp');
  });

  it('undo keeps the trailing space of the remaining words exactly', () => {
    const clock = withClock();
    const editor = createEditor();
    typeText(editor, 'alpha bravo charlie delta echo', 60, clock);
    editor.commands.undo();
    expect(editor.getText()).toBe('alpha bravo charlie delta ');
  });
});
