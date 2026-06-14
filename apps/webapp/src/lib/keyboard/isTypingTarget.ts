const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'radio',
  'submit',
  'reset',
  'file',
  'image',
  'hidden',
  'color',
  'range',
]);

const TYPING_ROLES = new Set(['textbox', 'combobox', 'searchbox']);

function isContentEditableElement(element: HTMLElement): boolean {
  const contentEditable = element.getAttribute('contenteditable');
  return (
    element.isContentEditable ||
    element.contentEditable === 'true' ||
    contentEditable === '' ||
    contentEditable === 'true'
  );
}

function isTextInputElement(element: HTMLInputElement): boolean {
  return !NON_TEXT_INPUT_TYPES.has(element.type.toLowerCase());
}

/**
 * Returns true when the given element is a text-entry context where
 * single-key shortcuts should be suppressed (user is typing).
 */
// fallow-ignore-next-line complexity
export function isTypingTarget(element: Element | null | undefined): boolean {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return true;
  }

  if (isContentEditableElement(element)) {
    return true;
  }

  if (element instanceof HTMLInputElement) {
    return isTextInputElement(element);
  }

  const role = element.getAttribute('role');
  return role !== null && TYPING_ROLES.has(role);
}
