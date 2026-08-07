import type { MDXEditorProps } from '@mdxeditor/editor';

export type MarkdownEditorProps = {
  /** Initial markdown content. Avoid rebinding on every onChange. */
  defaultMarkdown?: string;
  /** Called when content changes. */
  onChange?: (markdown: string) => void;
  /** Placeholder when empty. */
  placeholder?: string;
  className?: string;
  readOnly?: never;
} & Omit<MDXEditorProps, 'markdown' | 'onChange' | 'readOnly' | 'plugins'>;

export type MarkdownViewerProps = {
  markdown: string;
  className?: string;
};
