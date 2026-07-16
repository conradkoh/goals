import { describe, expect, it } from 'vitest';

import { getInitiativeColorFromTitle } from './initiative-color';

const PALETTE_SIZE = 12;

const PALETTE_COLORS = new Set([
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#00C7BE',
  '#30B0C7',
  '#32ADE6',
  '#007AFF',
  '#5856D6',
  '#AF52DE',
  '#FF2D55',
  '#A2845E',
]);

describe('getInitiativeColorFromTitle', () => {
  it('returns a palette color for non-empty titles', () => {
    const color = getInitiativeColorFromTitle('Launch Q3');
    expect(PALETTE_COLORS).toContain(color);
  });

  it('is stable for the same title', () => {
    expect(getInitiativeColorFromTitle('Health')).toBe(getInitiativeColorFromTitle('Health'));
  });

  it('is case and whitespace insensitive', () => {
    expect(getInitiativeColorFromTitle('Health')).toBe(getInitiativeColorFromTitle('  HEALTH  '));
  });

  it('assigns different colors to clearly distinct titles', () => {
    expect(getInitiativeColorFromTitle('Launch Q3')).not.toBe(
      getInitiativeColorFromTitle('Health & Fitness')
    );
  });

  it('distributes colors across the palette for varied titles', () => {
    const titles = Array.from({ length: 24 }, (_, i) => `Initiative ${i + 1}`);
    const colors = new Set(titles.map(getInitiativeColorFromTitle));
    expect(colors.size).toBeGreaterThan(1);
    expect(colors.size).toBeLessThanOrEqual(PALETTE_SIZE);
  });

  it('falls back to first palette color for empty titles', () => {
    expect(getInitiativeColorFromTitle('   ')).toBe('#FF3B30');
  });
});
