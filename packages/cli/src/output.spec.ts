import { describe, expect, it } from 'vitest';

import { formatKeyValues, formatTable, toJson } from './output.js';

describe('formatKeyValues', () => {
  it('pads every key to the longest key plus a colon and two spaces', () => {
    const output = formatKeyValues([
      ['Name', 'Ada Lovelace'],
      ['User ID', 'user_1'],
      ['Identity', 'work'],
      ['Environment', 'default'],
      ['Server', 'example-123.convex.site'],
      ['Created', '2026-01-01T00:00:00.000Z'],
      ['Expires', '2026-06-30T00:00:00.000Z'],
      ['Valid', 'yes'],
    ]);

    expect(output).toBe(
      [
        'Name:         Ada Lovelace',
        'User ID:      user_1',
        'Identity:     work',
        'Environment:  default',
        'Server:       example-123.convex.site',
        'Created:      2026-01-01T00:00:00.000Z',
        'Expires:      2026-06-30T00:00:00.000Z',
        'Valid:        yes',
        '',
      ].join('\n')
    );
  });
});

describe('formatTable', () => {
  it('left-aligns columns, pads them and prepends row markers', () => {
    const output = formatTable(
      ['LABEL', 'NAME', 'ENVIRONMENT', 'SERVER'],
      [
        ['default', 'Ada Lovelace', 'default', 'example-123.convex.site'],
        ['dev', 'Ada Lovelace', 'dev', '127.0.0.1:3211'],
      ],
      ['* ', '  ']
    );

    expect(output).toBe(
      [
        '  LABEL    NAME          ENVIRONMENT  SERVER',
        '* default  Ada Lovelace  default      example-123.convex.site',
        '  dev      Ada Lovelace  dev          127.0.0.1:3211',
        '',
      ].join('\n')
    );
  });

  it('trims trailing whitespace from every line', () => {
    const output = formatTable(['A', 'BB'], [['x', 'y']], ['  ']);

    expect(output).toBe(['  A  BB', '  x  y', ''].join('\n'));
  });
});

describe('toJson', () => {
  it('pretty-prints with two spaces and one trailing newline', () => {
    expect(toJson({ name: 'Ada', valid: true })).toBe('{\n  "name": "Ada",\n  "valid": true\n}\n');
    expect(toJson([])).toBe('[]\n');
  });
});
