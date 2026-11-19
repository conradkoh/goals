/** `Key:` + padding to a common column (longest key + colon + two spaces); one row per line. */
export function formatKeyValues(rows: readonly (readonly [string, string])[]): string {
  const width = rows.reduce((longest, [key]) => Math.max(longest, key.length), 0) + 3;
  const lines = rows.map(([key, value]) => `${`${key}:`.padEnd(width)}${value}`);
  return `${lines.join('\n')}\n`;
}

function columnWidths(headers: readonly string[], rows: readonly (readonly string[])[]): number[] {
  return headers.map((header, column) =>
    rows.reduce((longest, row) => Math.max(longest, row[column]?.length ?? 0), header.length)
  );
}

function tableLine(cells: readonly string[], widths: readonly number[], marker: string): string {
  const padded = cells.map((cell, column) => cell.padEnd(widths[column] ?? 0));
  return `${marker}${padded.join('  ')}`.trimEnd();
}

/**
 * Left-aligned columns separated by two spaces, each line trimEnd()-ed. `markers[i]` is
 * prepended to body row i; the header always gets two spaces so columns stay aligned.
 */
export function formatTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  markers: readonly string[]
): string {
  const widths = columnWidths(headers, rows);
  const lines = [
    tableLine(headers, widths, '  '),
    ...rows.map((row, index) => tableLine(row, widths, markers[index] ?? '  ')),
  ];
  return `${lines.join('\n')}\n`;
}

/** `JSON.stringify(value, null, 2)` plus one trailing newline. */
export function toJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
