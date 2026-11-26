import { act, render } from '@testing-library/react';
import type { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RichTextEditor, type RichTextEditorHandle } from './rich-text-editor';

vi.mock('./rich-text-editor.module.css', () => ({ default: {} }));

// TRIAGE REGRESSION SEAM: drives the real <RichTextEditor> through ProseMirror transactions with a
// controllable clock, then asks the editor's own undo command what is left.
function setup(html = '') {
  const { container } = render(<RichTextEditor value={html} onChange={() => {}} autoFocus />);
  const dom = container.querySelector('.ProseMirror') as HTMLElement & { editor: Editor };
  return dom.editor;
}

/** Types `text` one char at a time; `keyDelayMs` is the simulated gap between keystrokes. */
function type(editor: Editor, text: string, keyDelayMs: number, clock: { now: number }) {
  for (const ch of text) {
    clock.now += keyDelayMs;
    act(() => {
      editor.view.dispatch(editor.state.tr.insertText(ch));
    });
  }
}

const plain = (editor: Editor) => editor.getText().trim();

describe('RichTextEditor undo granularity', () => {
  afterEach(() => vi.restoreAllMocks());

  function withClock() {
    const clock = { now: 1_000_000 };
    vi.spyOn(Date, 'now').mockImplementation(() => clock.now);
    return clock;
  }

  it('one undo after continuous typing (<500ms between keys) removes only the last word', () => {
    const clock = withClock();
    const editor = setup();
    type(editor, 'alpha bravo charlie delta echo', 60, clock);
    act(() => void editor.commands.undo());
    // RED today: whole sentence is one history group -> ''
    expect(plain(editor)).toBe('alpha bravo charlie delta');
  });

  it('repeated undo walks back word by word and redo replays the same groups', () => {
    const clock = withClock();
    const editor = setup();
    type(editor, 'alpha bravo charlie', 60, clock);
    act(() => void editor.commands.undo());
    expect(plain(editor)).toBe('alpha bravo');
    act(() => void editor.commands.undo());
    expect(plain(editor)).toBe('alpha');
    act(() => void editor.commands.redo());
    expect(plain(editor)).toBe('alpha bravo');
  });

  it('control: a >500ms pause between words already yields one word per undo', () => {
    const clock = withClock();
    const editor = setup();
    for (const w of ['alpha ', 'bravo ', 'charlie']) {
      type(editor, w, 60, clock);
      clock.now += 800;
    }
    act(() => void editor.commands.undo());
    expect(plain(editor)).toBe('alpha bravo');
  });

  it('pressing Enter inside continuous typing starts a new undo group', () => {
    const clock = withClock();
    const editor = setup();
    type(editor, 'alpha', 60, clock);
    clock.now += 60;
    act(() => void editor.commands.splitBlock());
    type(editor, 'bravo', 60, clock);
    act(() => void editor.commands.undo());
    expect(editor.state.doc.childCount).toBe(2);
    expect(plain(editor)).toBe('alpha');
  });

  it('undo after an external setContent (server sync) does not restore pre-sync text', () => {
    const clock = withClock();
    const ref: { current: RichTextEditorHandle | null } = { current: null };
    const { container } = render(
      <RichTextEditor value="" onChange={() => {}} editorRef={ref} autoFocus />
    );
    const editor = (container.querySelector('.ProseMirror') as HTMLElement & { editor: Editor })
      .editor;
    type(editor, 'local draft', 60, clock);
    clock.now += 800;
    act(() => ref.current?.setContent('<p>SERVER COPY</p>'));
    clock.now += 800;
    act(() => void editor.commands.undo());
    expect(plain(editor)).toBe('SERVER COPY');
  });

  it('undo after a controlled value sync (document load) does not blank the document', () => {
    const { container, rerender } = render(<RichTextEditor value="" onChange={() => {}} />);
    const editor = (container.querySelector('.ProseMirror') as HTMLElement & { editor: Editor })
      .editor;
    rerender(<RichTextEditor value="<p>loaded from server</p>" onChange={() => {}} />);
    act(() => void editor.commands.undo());
    expect(plain(editor)).toBe('loaded from server');
  });
});
