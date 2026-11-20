import { Extension, type Editor } from '@tiptap/core';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { Markdown } from '@tiptap/markdown';
import { Fragment, Slice, type Node as PMNode, type Schema } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useImperativeHandle, useRef } from 'react';

import styles from './rich-text-editor.module.css';
import { isPlainTextEquivalentHtml, looksLikeMarkdownDocument } from './rich-text-markdown-paste';

import { shouldInterceptPasteForMarkdownConversion } from '@/components/markdown-editor/utils/pasteHandler';
import { cn } from '@/lib/utils';

/** Returns true when the event target is a TipTap task-list checkbox or its label. */
export function isTaskCheckboxInteraction(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'li[data-type="taskItem"] > label, li.task-item > label, li[data-type="taskItem"] > input[type="checkbox"], li.task-item > input[type="checkbox"]'
    )
  );
}

/**
 * Reconciles a native TipTap task checkbox with the ProseMirror task-item node.
 * TipTap's node view handles this in most browsers; the DOM-event fallback is
 * intentionally idempotent so it repairs browsers that update the native input
 * without dispatching the corresponding editor transaction.
 */
export function syncTaskCheckboxFromDOM(view: EditorView, event: Event): boolean {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return false;

  const taskItem = target.closest<HTMLLIElement>('li[data-type="taskItem"], li.task-item');
  if (!taskItem) return false;

  let position: number;
  try {
    position = view.posAtDOM(taskItem, 0);
  } catch {
    return false;
  }

  let node = view.state.doc.nodeAt(position);
  // A custom NodeView can map its outer DOM node to the start of its content.
  // In that case, the task item itself is immediately before the mapped node.
  if (node?.type.name !== 'taskItem' && position > 0) {
    const taskItemPosition = position - 1;
    const precedingNode = view.state.doc.nodeAt(taskItemPosition);
    if (precedingNode?.type.name === 'taskItem') {
      position = taskItemPosition;
      node = precedingNode;
    }
  }

  if (!node || node.type.name !== 'taskItem' || node.attrs.checked === target.checked) {
    return false;
  }

  view.dispatch(
    view.state.tr.setNodeMarkup(position, undefined, {
      ...node.attrs,
      checked: target.checked,
    })
  );
  return false;
}

/** Helper function to check if HTML content is effectively empty */
export function isHTMLEmpty(html: string) {
  // Remove all HTML tags
  const textContent = html.replace(/<[^>]*>/g, '');
  // Remove all whitespace, including non-breaking spaces and other special characters
  // biome-ignore lint/suspicious/noMisleadingCharacterClass: Unicode ranges intentionally match individual characters
  const cleanContent = textContent.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '');
  return cleanContent === '';
}

/**
 * Strips trailing empty paragraphs from HTML content.
 * TipTap often adds empty <p></p> or <p><br></p> at the end of content.
 */
export function stripTrailingEmptyParagraphs(html: string): string {
  // Match trailing empty paragraphs: <p></p>, <p><br></p>, <p><br/></p>, <p class="..."></p>, etc.
  // Also handles whitespace between tags
  return html.replace(/(<p[^>]*>(\s*(<br\s*\/?>)?\s*)<\/p>\s*)+$/gi, '');
}

/**
 * Decides whether the caret should be scrolled into view when the editor gains
 * focus.
 *
 * Scrolling only makes sense when focus came from an explicit pointer
 * interaction (tapping/clicking into the editor) so the on-screen keyboard can
 * stay visible on mobile. Passive refocus — e.g. the user alt-tabs back into
 * the browser or returns from another tab — must NOT scroll, otherwise the
 * scratchpad would jump back to the caret after the user scrolled away.
 *
 * `skipScrollFromVisibilityRestore` is set when the document became visible
 * again after being hidden; the next focus is consumed (and skipped) so a
 * visibility restore never triggers a scroll.
 */
export function shouldScrollCaretOnFocus(input: {
  focusFromPointer: boolean;
  skipScrollFromVisibilityRestore: boolean;
  isTaskCheckboxInteraction: boolean;
}): boolean {
  if (input.isTaskCheckboxInteraction) return false;
  if (input.skipScrollFromVisibilityRestore) return false;
  if (!input.focusFromPointer) return false;
  return true;
}

/**
 * Custom Tiptap extension that prevents new lines from being added when Cmd/Ctrl + Enter is pressed.
 * This is used in conjunction with the form submission shortcut (useFormSubmitShortcut) to ensure
 * that pressing Cmd/Ctrl + Enter only submits the form and doesn't add a new line in the editor.
 *
 * The extension works by:
 * 1. Adding a ProseMirror plugin that intercepts keydown events
 * 2. When Cmd/Ctrl + Enter is detected, it returns true to mark the event as handled
 * 3. This prevents the default editor behavior (adding a new line)
 *
 * @see https://github.com/ueberdosis/tiptap/issues/313
 */
const NoNewLineOnSubmit = Extension.create({
  name: 'no_new_line_on_submit',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('eventHandler'),
        props: {
          handleKeyDown: (_view: EditorView, event: KeyboardEvent) => {
            // Prevent new line on Cmd/Ctrl + Enter
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              return true; // Return true to mark the event as handled
            }
            return false; // Allow other key events to be handled normally
          },
        },
      }),
    ];
  },
});

/**
 * Keeps Tab / Shift-Tab inside the editor.
 *
 * List indent/outdent (sinkListItem / liftListItem) is bound by the list extensions at the
 * default priority and runs first. When it declines (nothing valid to indent/outdent, first
 * list item, plain paragraph, ...) no handler would return true, ProseMirror would leave the
 * key unhandled and the browser would move focus to another element. This low-priority guard
 * claims those leftover presses so they are a no-op while the caret is in the editor.
 * Modified Tab (Ctrl/Cmd/Alt+Tab) is left alone so OS/browser shortcuts keep working.
 */
const KeepTabInEditor = Extension.create({
  name: 'keep_tab_in_editor',
  priority: 1, // lower than the default (100) so list keymaps handle Tab first
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('keepTabInEditor'),
        props: {
          handleKeyDown: (_view: EditorView, event: KeyboardEvent) => {
            if (event.key !== 'Tab') return false;
            if (event.ctrlKey || event.metaKey || event.altKey) return false;
            return true; // handled -> ProseMirror calls preventDefault, focus stays put
          },
        },
      }),
    ];
  },
});

/**
 * Custom Tiptap extension that handles pasting of markdown task list syntax.
 * Converts `- [ ] task` or `- [x] task` syntax to proper task list nodes.
 */
/**
 * Custom Tiptap extension for markdown-style shortcuts triggered on space.
 * Converts line prefixes like `# `, `- `, `1. `, `[ ] `, `> `, ```` ``` ```` into
 * their rich-text equivalents.
 */
const MarkdownLineShortcuts = Extension.create({
  name: 'markdown_line_shortcuts',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('markdownLineShortcuts'),
        props: {
          handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
            if (event.key !== ' ' || event.metaKey || event.ctrlKey) return false;

            const { from } = view.state.selection;
            const line = view.state.doc.textBetween(Math.max(0, from - 10), from, '\n');

            if (line.endsWith('# ')) {
              editor.commands.setHeading({ level: 1 });
              return true;
            }
            if (line.endsWith('## ')) {
              editor.commands.setHeading({ level: 2 });
              return true;
            }
            if (line.endsWith('### ')) {
              editor.commands.setHeading({ level: 3 });
              return true;
            }
            if (line.endsWith('* ') || line.endsWith('- ')) {
              editor.commands.toggleBulletList();
              return true;
            }
            if (line.endsWith('1. ')) {
              editor.commands.toggleOrderedList();
              return true;
            }
            if (line.endsWith('[ ] ') || line.endsWith('[x] ')) {
              editor.commands.toggleTaskList();
              return true;
            }
            if (line.endsWith('> ')) {
              editor.commands.toggleBlockquote();
              return true;
            }
            if (line.endsWith('``` ')) {
              editor.commands.toggleCodeBlock();
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

/**
 * Custom Tiptap extension that converts a pasted URL into a link when text is selected.
 */
const LinkPasteHandler = Extension.create({
  name: 'link_paste_handler',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('linkPasteHandler'),
        props: {
          handlePaste: (_view: EditorView, event: ClipboardEvent) => {
            const clipboardText = event.clipboardData?.getData('text/plain');
            if (!clipboardText) return false;

            if (clipboardText.match(/^https?:\/\//) && editor.state.selection.content().size > 0) {
              editor.commands.setLink({ href: clipboardText });
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

/**
 * Custom Tiptap extension that opens links in the system browser on Cmd/Ctrl+Click.
 * In PWA mode, Tiptap's built-in `window.open()` keeps navigation inside the PWA webview.
 * By creating and clicking a native `<a>` element, Safari correctly routes to the system browser.
 */
const PWALinkClickHandler = Extension.create({
  name: 'pwa_link_click_handler',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('pwaLinkClickHandler'),
        props: {
          handleClick: (_view: EditorView, _pos: number, event: MouseEvent) => {
            if (!event.metaKey && !event.ctrlKey) return false;
            const link = (event.target as HTMLElement).closest?.('a');
            if (!link) return false;
            const href = link.getAttribute('href');
            if (!href) return false;
            const nativeLink = document.createElement('a');
            nativeLink.href = href;
            nativeLink.target = '_blank';
            nativeLink.rel = 'noopener noreferrer nofollow';
            nativeLink.click();
            return true;
          },
        },
      }),
    ];
  },
});

/**
 * The `orderedList` extension claims any plain-text paste whose lines all start with a number
 * marker (`2024. was a strong year`), and the mark paste rules consume `**text**` in plain-text
 * pastes. A block-level plain-text paste that the detector rejected is inserted literally so no
 * extension reinterprets it.
 */
const NUMBERED_LINE = /^[ \t]*\d{1,9}[.)][ \t]+\S/;

function isLiteralBlockPaste(plainText: string, html: string): boolean {
  if (html.trim() || !trimPasteNewlines(plainText)) return false;
  return plainText.includes('\n') || NUMBERED_LINE.test(plainText);
}

/** Line breaks at either end of a paste never create blocks of their own. */
function trimPasteNewlines(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/^\n+|\n+$/g, '');
}

/**
 * Inserts blocks the way ProseMirror inserts plain text: when the first (or last) block is a
 * paragraph, its text joins the text before (or after) the caret instead of splitting the
 * paragraph. A caret in an empty paragraph is replaced so no empty block is left behind.
 */
function insertBlocks(view: EditorView, blocks: PMNode[]): void {
  const { state } = view;
  const { selection } = state;
  const { $from } = selection;
  const isEmptyCaretBlock =
    selection.empty && $from.parent.isTextblock && $from.parent.content.size === 0;
  const tr = isEmptyCaretBlock
    ? state.tr.replaceWith($from.before(), $from.after(), blocks)
    : state.tr.replaceSelection(
        new Slice(
          Fragment.from(blocks),
          blocks[0].type.name === 'paragraph' ? 1 : 0,
          blocks[blocks.length - 1].type.name === 'paragraph' ? 1 : 0
        )
      );
  view.dispatch(tr.scrollIntoView());
}

/**
 * Plain-text paste. One line is inserted as text at the caret. Several lines become paragraphs
 * whose first and last lines join the surrounding text.
 */
function insertLiteralText(view: EditorView, text: string): void {
  const lines = trimPasteNewlines(text).split(/\n+/);
  if (lines.length === 1) {
    view.dispatch(view.state.tr.insertText(lines[0]).scrollIntoView());
    return;
  }
  const { paragraph } = view.state.schema.nodes;
  const { schema } = view.state;
  insertBlocks(
    view,
    lines.map((line) => paragraph.create(null, line ? schema.text(line) : null))
  );
}

/** Parses pasted Markdown into top-level blocks. Empty when the parser produces nothing. */
function markdownBlocks(editor: Editor, schema: Schema, markdown: string): PMNode[] {
  const parsed = editor.markdown?.parse(markdown);
  if (!parsed) return [];
  const blocks: PMNode[] = [];
  schema.nodeFromJSON(parsed).forEach((block) => blocks.push(block));
  return blocks;
}

/** Inline content joins the caret's paragraph with no block split. */
function insertInline(view: EditorView, content: Fragment): void {
  view.dispatch(view.state.tr.replaceSelection(new Slice(content, 0, 0)).scrollIntoView());
}

/**
 * Converts pasted raw Markdown (for example copied from a .md file) into rich text.
 * Conservative detection (see `looksLikeMarkdownDocument`): rich HTML pastes, plain prose,
 * and pastes inside code stay on the default handlers. A plain-text paste the detector
 * rejects is inserted literally when another extension would otherwise reinterpret it.
 */
const MarkdownPaste = Extension.create({
  name: 'markdown_paste',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('markdownPaste'),
        props: {
          handlePaste: (view: EditorView, event: ClipboardEvent) => {
            if (!shouldInterceptPasteForMarkdownConversion(editor)) return false;
            const plainText = event.clipboardData?.getData('text/plain') ?? '';
            if (!looksLikeMarkdownDocument(plainText)) {
              // No HTML payload means the block paste handlers run; keep the text literal.
              if (isLiteralBlockPaste(plainText, event.clipboardData?.getData('text/html') ?? '')) {
                event.preventDefault();
                insertLiteralText(view, plainText);
                return true;
              }
              return false;
            }
            const html = event.clipboardData?.getData('text/html') ?? '';
            if (html.trim() && !isPlainTextEquivalentHtml(html, plainText)) return false;

            const markdown = plainText.replace(/\r\n?/g, '\n');
            const blocks = markdownBlocks(editor, view.state.schema, markdown);
            if (blocks.length === 0) return false;

            event.preventDefault();
            if (blocks.length === 1 && blocks[0].type.name === 'paragraph') {
              insertInline(view, blocks[0].content);
            } else {
              insertBlocks(view, blocks);
            }
            return true;
          },
        },
      }),
    ];
  },
});

const MarkdownTaskListPaste = Extension.create({
  name: 'markdown_task_list_paste',
  addProseMirrorPlugins() {
    // Store editor reference to avoid 'this' aliasing
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('markdownTaskListPaste'),
        props: {
          handlePaste: (_view: EditorView, event: ClipboardEvent) => {
            const clipboardText = event.clipboardData?.getData('text/plain');
            if (!clipboardText) return false;

            // Check if the pasted text contains task list markdown syntax
            // Matches: - [ ] task, - [x] task, * [ ] task, * [X] task
            const taskListRegex = /^(\s*)[-*]\s*\[([ xX])\]\s*(.*)$/;
            const lines = clipboardText.split('\n');
            const hasTaskListSyntax = lines.some((line) => taskListRegex.test(line));

            if (!hasTaskListSyntax) return false;

            // Prevent default paste
            event.preventDefault();

            // Convert markdown task list syntax to Tiptap content
            type TaskItemNode = {
              type: 'taskItem';
              attrs: { checked: boolean };
              content: {
                type: 'paragraph';
                content?: { type: 'text'; text: string }[];
              }[];
            };
            type ParagraphNode = {
              type: 'paragraph';
              content?: { type: 'text'; text: string }[];
            };
            type TaskListNode = {
              type: 'taskList';
              content: TaskItemNode[];
            };
            type ContentNode = TaskListNode | ParagraphNode;

            const content: ContentNode[] = [];
            let currentTaskList: TaskItemNode[] | null = null;

            for (const line of lines) {
              const match = line.match(taskListRegex);
              if (match) {
                const isChecked = match[2].toLowerCase() === 'x';
                const text = match[3];

                if (!currentTaskList) {
                  currentTaskList = [];
                }

                currentTaskList.push({
                  type: 'taskItem',
                  attrs: { checked: isChecked },
                  content: [
                    {
                      type: 'paragraph',
                      content: text ? [{ type: 'text', text }] : undefined,
                    },
                  ],
                });
              } else {
                // Non-task line: flush current task list and add paragraph
                if (currentTaskList && currentTaskList.length > 0) {
                  content.push({
                    type: 'taskList',
                    content: currentTaskList,
                  });
                  currentTaskList = null;
                }

                // Add non-empty lines as paragraphs
                if (line.trim()) {
                  content.push({
                    type: 'paragraph',
                    content: [{ type: 'text', text: line }],
                  });
                }
              }
            }

            // Flush remaining task list
            if (currentTaskList && currentTaskList.length > 0) {
              content.push({
                type: 'taskList',
                content: currentTaskList,
              });
            }

            if (content.length > 0) {
              // Insert the converted content
              editor?.commands.insertContent(content);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

/** Imperative handle for pushing external content into the editor without triggering onChange. */
export interface RichTextEditorHandle {
  setContent: (html: string) => void;
  getContent: () => string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** Whether to automatically focus the editor when mounted */
  autoFocus?: boolean;
  /**
   * When provided, the editor operates in uncontrolled mode:
   * - `value` is only used as the initial content at mount time
   * - External content should be pushed via `editorRef.current.setContent()`
   *   which does NOT trigger onChange (breaking feedback loops)
   * - The `value` prop useEffect sync is disabled
   */
  editorRef?: React.MutableRefObject<RichTextEditorHandle | null>;
}

export function RichTextEditor({
  value,
  onChange,
  className,
  placeholder,
  autoFocus = false,
  editorRef,
}: RichTextEditorProps) {
  const isExternalUpdateRef = useRef(false);
  const lastPointerTargetRef = useRef<EventTarget | null>(null);
  const isUncontrolled = editorRef !== undefined;

  const editor = useEditor({
    autofocus: autoFocus,
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            class: 'leading-normal',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc ml-4 my-2',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal ml-4 my-2',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'leading-normal',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm text-foreground',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'rounded-md bg-muted p-4 font-mono text-sm text-foreground',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-2 border-muted pl-4',
          },
        },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-primary underline',
            target: '_blank',
            rel: 'noopener noreferrer nofollow',
          },
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list my-2',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item flex gap-2',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Markdown,
      NoNewLineOnSubmit,
      KeepTabInEditor,
      MarkdownLineShortcuts,
      LinkPasteHandler,
      PWALinkClickHandler,
      MarkdownTaskListPaste,
      // Registered after `MarkdownTaskListPaste` on purpose: TipTap builds its plugin list by
      // reversing the extension list for equal-priority extensions, so a later entry runs its
      // `handlePaste` first. Markdown documents that contain task items must reach the Markdown
      // converter before the task-list fallback claims them.
      MarkdownPaste,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert text-sm max-w-none focus:outline-none min-h-[150px] h-full min-w-0 p-3 rounded-md border break-words [word-break:break-word] overflow-x-hidden',
          styles.prose,
          className
        ),
      },
      handleDOMEvents: {
        change: syncTaskCheckboxFromDOM,
        click: syncTaskCheckboxFromDOM,
      },
      handleScrollToSelection: () => {
        if (isTaskCheckboxInteraction(lastPointerTargetRef.current)) return true;
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (isExternalUpdateRef.current) return;
      const html = editor.getHTML();
      const cleanedHtml = stripTrailingEmptyParagraphs(html);
      onChange(cleanedHtml);
    },
    immediatelyRender: false,
  });

  // Expose imperative handle for uncontrolled mode
  useImperativeHandle(
    editorRef,
    () => ({
      setContent: (html: string) => {
        if (!editor || editor.isDestroyed) return;
        isExternalUpdateRef.current = true;
        editor.commands.setContent(html || '');
        isExternalUpdateRef.current = false;
      },
      getContent: () => {
        if (!editor || editor.isDestroyed) return '';
        return stripTrailingEmptyParagraphs(editor.getHTML());
      },
    }),
    [editor]
  );

  useEffect(() => {
    if (!editorRef) return;
    return () => {
      editorRef.current = null;
    };
  }, [editorRef]);

  // Controlled mode: sync value prop → editor (only when editorRef is NOT provided).
  // The editor is created with `value` as its initial content, so the first run is skipped:
  // re-applying the value would replace the document with itself and move the caret to the end.
  const hasAppliedInitialValueRef = useRef(false);
  useEffect(() => {
    if (isUncontrolled) return;
    if (!editor || editor.isDestroyed) return;
    if (!hasAppliedInitialValueRef.current) {
      hasAppliedInitialValueRef.current = true;
      return;
    }
    if (editor.isFocused) return;
    const currentHtml = stripTrailingEmptyParagraphs(editor.getHTML());
    if (currentHtml !== value) {
      editor.commands.setContent(value || '');
    }
  }, [editor, value, isUncontrolled]);

  // Toggle pointer cursor on links when Cmd/Ctrl is held
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom;
    const addClass = () => el.classList.add('cmd-hover-active');
    const removeClass = () => el.classList.remove('cmd-hover-active');

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') addClass();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') removeClass();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', removeClass);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', removeClass);
      removeClass();
    };
  }, [editor]);

  // Keep the caret visible above the on-screen keyboard on mobile when the user
  // taps into the editor. Skip on window refocus (alt-tab) so scroll position
  // is preserved.
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom as HTMLElement;

    let focusFromPointer = false;
    let skipScrollFromVisibilityRestore = false;
    let isTaskCheckboxInteractionActive = false;

    const markPointerFocus = (event: Event) => {
      lastPointerTargetRef.current = event.target;
      if (isTaskCheckboxInteraction(event.target)) {
        isTaskCheckboxInteractionActive = true;
        return;
      }
      focusFromPointer = true;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Next focus after tab/window restore should not scroll
        skipScrollFromVisibilityRestore = true;
        focusFromPointer = false;
      }
    };

    const scrollCaretIntoView = () => {
      const shouldScroll = shouldScrollCaretOnFocus({
        focusFromPointer,
        skipScrollFromVisibilityRestore,
        isTaskCheckboxInteraction: isTaskCheckboxInteractionActive,
      });
      if (skipScrollFromVisibilityRestore) {
        skipScrollFromVisibilityRestore = false;
      }
      if (isTaskCheckboxInteractionActive) isTaskCheckboxInteractionActive = false;
      if (!shouldScroll) return;
      focusFromPointer = false;

      // Defer to next frame so the keyboard/viewport has begun resizing.
      requestAnimationFrame(() => {
        if (!editor || editor.isDestroyed) return;
        const selection = window.getSelection();
        const node =
          selection && selection.rangeCount > 0
            ? (selection.getRangeAt(0).startContainer as Node)
            : null;
        const target =
          node && node.nodeType === Node.ELEMENT_NODE
            ? (node as HTMLElement)
            : (node?.parentElement ?? el);
        target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    };

    el.addEventListener('pointerdown', markPointerFocus, true);
    el.addEventListener('touchstart', markPointerFocus, true);
    el.addEventListener('focus', scrollCaretIntoView, true);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      el.removeEventListener('pointerdown', markPointerFocus, true);
      el.removeEventListener('touchstart', markPointerFocus, true);
      el.removeEventListener('focus', scrollCaretIntoView, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [editor]);

  return (
    <div className="relative min-w-0 h-full flex flex-col overflow-hidden">
      <EditorContent editor={editor} className="overflow-y-auto flex-1 min-h-0 flex flex-col" />
    </div>
  );
}
