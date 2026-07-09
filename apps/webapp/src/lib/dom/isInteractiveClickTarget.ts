const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, label, [contenteditable="true"], li[data-type="taskItem"]';

export function isInteractiveClickTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
}
