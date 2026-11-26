import { Extension, type Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';

/** A single character that ends a word when typed directly after a non-whitespace character. */
const WORD_END_CHAR = /^[\s.!?]$/;

/** Range of document text inserted by the transaction's last step, or null if it inserted nothing. */
function lastInsertedRange(tr: Transaction): { from: number; to: number } | null {
  const lastMap = tr.mapping.maps[tr.mapping.maps.length - 1];
  if (!lastMap) return null;
  const ranges: { from: number; to: number }[] = [];
  lastMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
    ranges.push({ from: newStart, to: newEnd });
  });
  return ranges[ranges.length - 1] ?? null;
}

/** True when `char` ends a word. */
function isWordEndChar(char: string): boolean {
  return WORD_END_CHAR.test(char);
}

/** True when the document has non-whitespace text immediately before `pos`. */
function followsWordCharacter(tr: Transaction, pos: number): boolean {
  const before = tr.doc.textBetween(Math.max(0, pos - 1), pos);
  return before.length > 0 && !/\s/.test(before);
}

/** True when the transaction typed a word-ending character right after a non-whitespace character. */
function endsTypedWord(tr: Transaction): boolean {
  const range = lastInsertedRange(tr);
  if (!range || range.to <= range.from) return false;
  const inserted = tr.doc.textBetween(range.from, range.to);
  return isWordEndChar(inserted.slice(-1)) && followsWordCharacter(tr, range.from);
}

/**
 * Closes the undo group after each typed word boundary (whitespace or sentence-end punctuation),
 * so one Cmd/Ctrl+Z removes one word instead of the whole typing burst.
 * Pauses longer than TipTap's `newGroupDelay` still split groups as before.
 */
export const UndoWordBoundary = Extension.create({
  name: 'undoWordBoundary',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('undoWordBoundary'),
        appendTransaction(transactions, _oldState, newState) {
          const typed = transactions.filter(
            (tr) => tr.docChanged && tr.getMeta('addToHistory') !== false
          );
          const last = typed[typed.length - 1];
          if (!last || !endsTypedWord(last)) return null;
          return closeHistory(newState.tr);
        },
      }),
    ];
  },
});

type SetContentOptions = Parameters<Editor['commands']['setContent']>[1];

/**
 * Replaces the document with programmatic content (initial load, server sync, reset) without
 * recording an undo step, so Cmd/Ctrl+Z never restores pre-sync text or blanks loaded content.
 * Options pass through unchanged (for example `emitUpdate`, `contentType: 'markdown'`).
 */
export function setContentWithoutHistory(
  editor: Editor,
  content: string,
  options?: SetContentOptions
): boolean {
  return editor.chain().setMeta('addToHistory', false).setContent(content, options).run();
}
