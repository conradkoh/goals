'use client';

import type { RichTextEditorHandle } from '@/components/ui/rich-text-editor';

export function removeCompletedItems(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const taskItems = doc.querySelectorAll('li[data-checked="true"]');
  taskItems.forEach((item) => item.remove());

  const paragraphs = doc.querySelectorAll('p');
  paragraphs.forEach((p) => {
    const text = p.textContent?.trim() ?? '';
    if (text === '' || text === '·' || text === '•' || text.match(/^[\[\]\s•·]+$/)) {
      p.remove();
    }
  });

  return doc.body.innerHTML;
}

export function removeCompletedItemsFromEditor(
  editorRef: React.MutableRefObject<RichTextEditorHandle | null>
) {
  const editor = editorRef.current;
  if (!editor) return null;
  return removeCompletedItems(editor.getContent());
}
