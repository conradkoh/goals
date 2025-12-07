import { Extension } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ConditionalRender } from '@/components/atoms/ConditionalRender';
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

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, className, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            class: 'min-h-[1.5em] leading-normal',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc ml-8',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal ml-8',
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
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm text-sm max-w-none focus:outline-none min-h-[150px] p-3 rounded-md border break-words [word-break:break-word]',
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
          // Handle link pasting over selected text
          const clipboardText = event.clipboardData?.getData('text/plain');
          if (clipboardText?.match(/^https?:\/\//) && editor.state.selection.content().size > 0) {
            editor.commands.setLink({ href: clipboardText });
            return true;
          }
          return false;
        },
      },
    });
  }
  const isEmpty = value === '';
  return (
    <div className="relative">
      <EditorContent editor={editor} />
      <ConditionalRender condition={isEmpty && !!placeholder}>
        <div className="absolute top-3 left-4 text-muted-foreground text-sm pointer-events-none">
          {placeholder}
        </div>
      </ConditionalRender>
    </div>
  );
}
