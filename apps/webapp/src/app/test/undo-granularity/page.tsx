'use client';

// TRIAGE HARNESS (dev-only, /test is redirected in production): mounts each editor family
// without Convex/auth so Playwright can measure Cmd/Ctrl+Z granularity.
import { useRef, useState } from 'react';

import { MarkdownEditor, defaultMarkdownEditorProseClassNames } from '@/components/markdown-editor';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/ui/rich-text-editor';

export default function UndoGranularityPage() {
  const [controlled, setControlled] = useState('');
  const [md, setMd] = useState('');
  const [asyncVal, setAsyncVal] = useState('');
  const ref = useRef<RichTextEditorHandle>(null);
  return (
    <div className="p-6 space-y-6">
      <section data-testid="rte-controlled">
        <RichTextEditor value={controlled} onChange={setControlled} />
        <pre data-testid="rte-controlled-state">{controlled}</pre>
      </section>
      <section data-testid="rte-uncontrolled">
        <RichTextEditor value="" onChange={() => {}} editorRef={ref} />
        <button
          data-testid="rte-ext-set"
          onClick={() => ref.current?.setContent('<p>SERVER COPY</p>')}
        >
          external set
        </button>
      </section>
      <section data-testid="rte-async">
        <RichTextEditor value={asyncVal} onChange={setAsyncVal} />
        <button
          data-testid="rte-async-load"
          onClick={() => setAsyncVal('<p>loaded from server</p>')}
        >
          simulate document load
        </button>
      </section>
      <section data-testid="md-editor">
        <MarkdownEditor
          defaultMarkdown={md}
          onChange={setMd}
          proseClassName={defaultMarkdownEditorProseClassNames}
        />
        <pre data-testid="md-state">{md}</pre>
      </section>
    </div>
  );
}
