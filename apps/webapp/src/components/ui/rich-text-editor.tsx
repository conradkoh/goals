import { Extension } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Underline from '@tiptap/extension-underline';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import styles from './rich-text-editor.module.css';

import { cn } from '@/lib/utils';

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
 * Custom Tiptap extension that handles pasting of markdown task list syntax.
 * Converts `- [ ] task` or `- [x] task` syntax to proper task list nodes.
 */
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

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** Whether to automatically focus the editor when mounted */
  autoFocus?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  className,
  placeholder,
  autoFocus = false,
}: RichTextEditorProps) {
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
            class: 'rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'rounded-md bg-muted p-4 font-mono text-sm',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-2 border-muted pl-4',
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
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      NoNewLineOnSubmit,
      MarkdownTaskListPaste,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm text-sm max-w-none focus:outline-none min-h-[150px] p-3 rounded-md border break-words [word-break:break-word]',
          styles.prose,
          className
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    immediatelyRender: false,
  });

  // Handle keyboard shortcuts
  if (editor) {
    editor.setOptions({
      editorProps: {
        handleKeyDown: (view, event) => {
          // Bold: Cmd/Ctrl + B
          if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
            editor.commands.toggleBold();
            return true;
          }
          // Italic: Cmd/Ctrl + I
          if ((event.metaKey || event.ctrlKey) && event.key === 'i') {
            editor.commands.toggleItalic();
            return true;
          }
          // Underline: Cmd/Ctrl + U
          if ((event.metaKey || event.ctrlKey) && event.key === 'u') {
            editor.commands.toggleUnderline();
            return true;
          }
          // Handle markdown shortcuts
          if (event.key === ' ' && !event.metaKey && !event.ctrlKey) {
            // Check for markdown syntax at the start of the line
            const { from } = view.state.selection;
            const line = view.state.doc.textBetween(Math.max(0, from - 10), from, '\n');

            // Handle basic markdown shortcuts
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
          }
          return false;
        },
        handlePaste: (_view, event) => {
          const clipboardText = event.clipboardData?.getData('text/plain');
          if (!clipboardText) return false;

          // Handle link pasting over selected text
          if (clipboardText.match(/^https?:\/\//) && editor.state.selection.content().size > 0) {
            editor.commands.setLink({ href: clipboardText });
            return true;
          }

          // Task list paste is handled by MarkdownTaskListPaste extension
          return false;
        },
      },
    });
  }
  return (
    <div className="relative">
      <EditorContent editor={editor} />
    </div>
  );
}
