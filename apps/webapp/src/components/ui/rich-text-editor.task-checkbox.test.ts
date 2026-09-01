import type { EditorView } from '@tiptap/pm/view';
import { describe, expect, it, vi } from 'vitest';

import { syncTaskCheckboxFromDOM } from './rich-text-editor';

vi.mock('./rich-text-editor.module.css', () => ({ default: {} }));

function eventFor(target: EventTarget): Event {
  const event = new Event('change', { bubbles: true });
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

function taskCheckboxFixture(checked: boolean): {
  checkbox: HTMLInputElement;
  taskItem: HTMLLIElement;
} {
  document.body.innerHTML = `
    <li data-type="taskItem" class="task-item flex gap-2">
      <label contenteditable="false">
        <input type="checkbox" aria-label="Task item checkbox for BCM - Template App" ${
          checked ? 'checked' : ''
        }>
        <span>BCM - Template App</span>
      </label>
      <div><p>BCM - Template App</p></div>
    </li>
  `;

  return {
    checkbox: document.querySelector('input[type="checkbox"]') as HTMLInputElement,
    taskItem: document.querySelector('li[data-type="taskItem"]') as HTMLLIElement,
  };
}

function mockView({ checked, position = 7 }: { checked: boolean; position?: number }) {
  const setNodeMarkup = vi.fn().mockReturnValue('task-item-transaction');
  const dispatch = vi.fn();
  const node = { attrs: { checked }, type: { name: 'taskItem' } };
  const view = {
    posAtDOM: vi.fn().mockReturnValue(position),
    state: {
      doc: { nodeAt: vi.fn().mockReturnValue(node) },
      tr: { setNodeMarkup },
    },
    dispatch,
  } as unknown as EditorView;

  return { dispatch, node, setNodeMarkup, view };
}

describe('syncTaskCheckboxFromDOM', () => {
  it('dispatches a checked task-item transaction when the native checkbox changed', () => {
    const { checkbox, taskItem } = taskCheckboxFixture(true);
    const { dispatch, setNodeMarkup, view } = mockView({ checked: false });

    expect(syncTaskCheckboxFromDOM(view, eventFor(checkbox))).toBe(false);

    expect(view.posAtDOM).toHaveBeenCalledWith(taskItem, 0);
    expect(setNodeMarkup).toHaveBeenCalledWith(7, undefined, { checked: true });
    expect(dispatch).toHaveBeenCalledWith('task-item-transaction');
  });

  it('is idempotent after TipTap already updated the task-item node', () => {
    const { checkbox } = taskCheckboxFixture(true);
    const { dispatch, setNodeMarkup, view } = mockView({ checked: true });

    expect(syncTaskCheckboxFromDOM(view, eventFor(checkbox))).toBe(false);

    expect(setNodeMarkup).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('ignores non-task checkboxes and safely ignores unmappable DOM nodes', () => {
    document.body.innerHTML = '<input type="checkbox" aria-label="Ordinary checkbox">';
    const ordinaryCheckbox = document.querySelector('input') as HTMLInputElement;
    const ordinaryView = mockView({ checked: false });

    expect(() =>
      syncTaskCheckboxFromDOM(ordinaryView.view, eventFor(ordinaryCheckbox))
    ).not.toThrow();
    expect(ordinaryView.dispatch).not.toHaveBeenCalled();

    const { checkbox } = taskCheckboxFixture(true);
    const unmappableView = mockView({ checked: false });
    vi.mocked(unmappableView.view.posAtDOM).mockImplementation(() => {
      throw new RangeError('DOM node is not mapped');
    });

    expect(() => syncTaskCheckboxFromDOM(unmappableView.view, eventFor(checkbox))).not.toThrow();
    expect(unmappableView.dispatch).not.toHaveBeenCalled();
  });
});
