import { act, render } from '@testing-library/react';
import type { Editor } from '@tiptap/core';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';

import { useMarkdownEditor } from './useMarkdownEditor';

type Api = { editor: Editor; setContent: (md: string) => unknown };

function Harness({ content, onReady }: { content: string; onReady: (api: Api) => void }) {
  const { editor, setContent } = useMarkdownEditor({ content, onUpdate: () => {} });
  useEffect(() => {
    if (editor) onReady({ editor, setContent });
  }, [editor, setContent, onReady]);
  return null;
}

const plain = (editor: Editor) => editor.getText().trim();

function requireApi(api: Api | undefined): Api {
  if (!api) throw new Error('useMarkdownEditor did not expose an editor');
  return api;
}

describe('useMarkdownEditor undo-safe content sync', () => {
  it('undo after the returned setContent does not restore pre-sync text', () => {
    let captured: Api | undefined;
    const onReady = (a: Api) => {
      captured = a;
    };
    render(<Harness content="" onReady={onReady} />);
    const api = requireApi(captured);
    act(() => {
      api.editor.view.dispatch(api.editor.state.tr.insertText('local draft'));
    });
    act(() => {
      api.setContent('SERVER COPY');
    });
    act(() => {
      api.editor.commands.undo();
    });
    expect(plain(api.editor)).toBe('SERVER COPY');
  });

  it('undo after a content prop change (external sync) does not revert to the previous content', () => {
    let captured: Api | undefined;
    const onReady = (a: Api) => {
      captured = a;
    };
    const { rerender } = render(<Harness content="# First" onReady={onReady} />);
    rerender(<Harness content="# Second" onReady={onReady} />);
    const api = requireApi(captured);
    act(() => {
      api.editor.commands.undo();
    });
    expect(plain(api.editor)).toBe('Second');
  });
});
