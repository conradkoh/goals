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

  it('removes completed items at the beginning', () => {
    const html =
      '<ul><li data-checked="true">First done</li><li data-checked="false">Second todo</li></ul>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('First done');
    expect(result).toContain('Second todo');
  });

  it('removes completed items at the end', () => {
    const html =
      '<ul><li data-checked="false">First todo</li><li data-checked="true">Last done</li></ul>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('Last done');
    expect(result).toContain('First todo');
  });

  it('removes completed items in the middle', () => {
    const html =
      '<ul><li data-checked="false">Todo 1</li><li data-checked="true">Done</li><li data-checked="false">Todo 2</li></ul>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('Done');
    expect(result).toContain('Todo 1');
    expect(result).toContain('Todo 2');
  });

  it('handles multiple completed items', () => {
    const html =
      '<ul><li data-checked="true">Done 1</li><li data-checked="true">Done 2</li><li data-checked="true">Done 3</li></ul>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('Done 1');
    expect(result).not.toContain('Done 2');
    expect(result).not.toContain('Done 3');
  });

  it('handles mixed indented and non-indented items', () => {
    const html =
      '<ul><li data-checked="false">Parent</li><ul><li data-checked="true">Nested done</li></ul></ul>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('Nested done');
    expect(result).toContain('Parent');
  });

  it('handles various nesting levels', () => {
    const html =
      '<ul><li data-checked="true">Level 1 done</li><ul><li data-checked="true">Level 2 done</li><ul><li data-checked="true">Level 3 done</li></ul></ul></ul>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('Level 1 done');
    expect(result).not.toContain('Level 2 done');
    expect(result).not.toContain('Level 3 done');
  });

  it('handles mixed indented completed and incomplete items', () => {
    const html =
      '<ul><li data-checked="true">Done parent</li><ul><li data-checked="false">Nested todo</li></ul></ul>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('Done parent');
    expect(result).toContain('Nested todo');
  });

  it('handles special characters in completed items', () => {
    const html =
      '<ul><li data-checked="true">Task with <strong>bold</strong> &amp; <em>italic</em></li></ul>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('Task with');
  });

  it('handles HTML entities in completed items', () => {
    const html = '<ul><li data-checked="true">Price: $50 &lt; $100 &gt; $25</li></ul>';
    const result = removeCompletedItems(html);
    expect(result).not.toContain('Price: $50');
  });

  it('preserves formatting of remaining content', () => {
    const html =
      '<p><strong>Bold</strong> and <em>italic</em> and <a href="#">link</a></p><ul><li data-checked="true">Done</li></ul>';
    const result = removeCompletedItems(html);
    expect(result).toContain('<strong>Bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<a href="#">link</a>');
  });

  it('handles real todo list with multiple items', () => {
    const html =
      '<ul><li data-checked="false">Buy groceries</li><li data-checked="true">Clean room</li><li data-checked="false">Do homework</li><li data-checked="true">Call mom</li></ul>';
    const result = removeCompletedItems(html);
    expect(result).toContain('Buy groceries');
    expect(result).toContain('Do homework');
    expect(result).not.toContain('Clean room');
    expect(result).not.toContain('Call mom');
  });

  it('handles task list with sub-tasks', () => {
    const html =
      '<ul><li data-checked="false">Main task<ul><li data-checked="true">Sub-task done</li><li data-checked="false">Sub-task todo</li></ul></li></ul>';
    const result = removeCompletedItems(html);
    expect(result).toContain('Main task');
    expect(result).toContain('Sub-task todo');
    expect(result).not.toContain('Sub-task done');
  });

  it('handles mix of tasks and regular text paragraphs', () => {
    const html =
      '<p>Here is my list:</p><ul><li data-checked="true">Done task</li><li data-checked="false">Todo task</li></ul><p>End of list.</p>';
    const result = removeCompletedItems(html);
    expect(result).toContain('Here is my list:');
    expect(result).toContain('Todo task');
    expect(result).toContain('End of list.');
    expect(result).not.toContain('Done task');
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
