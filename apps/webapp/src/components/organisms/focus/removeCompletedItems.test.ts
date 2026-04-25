import { describe, expect, it, vi } from 'vitest';

import { removeCompletedItems, removeCompletedItemsFromEditor } from './removeCompletedItems';

describe('removeCompletedItems', () => {
  it('removes completed task items', () => {
    const html = '<ul><li data-checked="true">Completed task</li></ul>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('Completed task');
  });

  it('preserves incomplete task items', () => {
    const html = '<ul><li data-checked="false">Incomplete task</li></ul>';
    const result = removeCompletedItems(html);
    expect(result).toContain('Incomplete task');
  });

  it('removes only completed items when mixed', () => {
    const html = '<ul><li data-checked="true">Done</li><li data-checked="false">Todo</li></ul>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('Done');
    expect(result).toContain('Todo');
  });

  it('removes empty paragraphs left after removing completed items', () => {
    const html = '<p></p><p>Valid content</p>';
    const result = removeCompletedItems(html);
    expect(result).toContain('Valid content');
  });

  it('removes paragraphs with only bullet symbols', () => {
    const html = '<p>·</p><p>Valid content</p>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('·');
    expect(result).toContain('Valid content');
  });

  it('removes paragraphs with only bullet symbols (•)', () => {
    const html = '<p>•</p><p>Valid content</p>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('•');
    expect(result).toContain('Valid content');
  });

  it('removes paragraphs with only brackets', () => {
    const html = '<p>[]</p><p>Valid content</p>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('[]');
    expect(result).toContain('Valid content');
  });

  it('preserves normal paragraphs with content', () => {
    const html = '<p>Some meaningful content</p>';
    const result = removeCompletedItems(html);
    expect(result).toContain('Some meaningful content');
  });

  it('handles empty HTML', () => {
    const html = '';
    const result = removeCompletedItems(html);
    expect(result).toBe('');
  });

  it('returns unchanged HTML without task items', () => {
    const html = '<p>Regular paragraph without tasks</p>';
    const result = removeCompletedItems(html);
    expect(result).toBe(html);
  });

  it('handles nested structures correctly', () => {
    const html =
      '<div><ul><li data-checked="true">Nested completed</li></ul><p>Other content</p></div>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('Nested completed');
    expect(result).toContain('Other content');
  });
});

describe('removeCompletedItemsFromEditor', () => {
  it('returns null when editorRef is null', () => {
    const mockRef = { current: null };
    const result = removeCompletedItemsFromEditor(mockRef as any);
    expect(result).toBeNull();
  });

  it('returns cleaned content from editor', () => {
    const mockEditor = {
      getContent: vi.fn().mockReturnValue('<ul><li data-checked="true">Done</li></ul>'),
    };
    const mockRef = { current: mockEditor };
    const result = removeCompletedItemsFromEditor(mockRef as any);
    expect(result).not.toContain('Done');
  });
});
