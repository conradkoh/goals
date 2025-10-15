export function getDueDateStyle(
  dueDate: Date | null | undefined,
  completed: boolean,
  currentTime: Date = new Date()
): string {
  if (!dueDate || completed) {
    return '';
  }

  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const currentDateOnly = new Date(
    currentTime.getFullYear(),
    currentTime.getMonth(),
    currentTime.getDate()
  );

  const timeDiff = dueDateOnly.getTime() - currentDateOnly.getTime();
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

  if (daysDiff < 0) {
    return 'text-red-600 dark:text-red-400';
  }

  if (daysDiff < 2) {
    return 'text-orange-600 dark:text-orange-400';
  }

  if (daysDiff < 3) {
    return 'text-yellow-600 dark:text-yellow-400';
  }

  return '';
}
