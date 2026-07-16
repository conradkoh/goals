import { describe, expect, it } from 'vitest';

import {
  buildInitiativeColorMap,
  getColorAtIndex,
  getInitiativeColorFromMap,
  INITIATIVE_COLOR_PALETTE,
  INITIATIVE_PALETTE_MIN_SIZE,
} from './initiative-color';

describe('INITIATIVE_COLOR_PALETTE', () => {
  it('has at least 30 colors', () => {
    expect(INITIATIVE_COLOR_PALETTE.length).toBeGreaterThanOrEqual(INITIATIVE_PALETTE_MIN_SIZE);
  });

  it('has unique colors', () => {
    const unique = new Set(INITIATIVE_COLOR_PALETTE);
    expect(unique.size).toBe(INITIATIVE_COLOR_PALETTE.length);
  });
});

describe('buildInitiativeColorMap', () => {
  it('assigns unique colors to 5 initiatives', () => {
    const initiatives = Array.from({ length: 5 }, (_, i) => ({
      _id: `initiative-${i}` as unknown as never,
      title: `Initiative ${i}`,
      _creationTime: 1000 + i,
    }));
    const map = buildInitiativeColorMap(initiatives);
    const colors = new Set(map.values());
    expect(colors.size).toBe(5);
  });

  it('assigns unique colors to 30 initiatives', () => {
    const initiatives = Array.from({ length: 30 }, (_, i) => ({
      _id: `initiative-${i}` as unknown as never,
      title: `Initiative ${i}`,
      _creationTime: 1000 + i,
    }));
    const map = buildInitiativeColorMap(initiatives);
    const colors = new Set(map.values());
    expect(colors.size).toBe(30);
  });

  it('assigns colors in creation order (earlier _creationTime → lower palette index)', () => {
    const initiatives = [
      { _id: 'c' as unknown as never, title: 'C', _creationTime: 3000 },
      { _id: 'a' as unknown as never, title: 'A', _creationTime: 1000 },
      { _id: 'b' as unknown as never, title: 'B', _creationTime: 2000 },
    ];
    const map = buildInitiativeColorMap(initiatives);
    expect(map.get('a' as unknown as never)).toBe(INITIATIVE_COLOR_PALETTE[0]);
    expect(map.get('b' as unknown as never)).toBe(INITIATIVE_COLOR_PALETTE[1]);
    expect(map.get('c' as unknown as never)).toBe(INITIATIVE_COLOR_PALETTE[2]);
  });

  it('uses title as tiebreaker when _creationTime is equal', () => {
    const initiatives = [
      { _id: 'b' as unknown as never, title: 'Beta', _creationTime: 1000 },
      { _id: 'a' as unknown as never, title: 'Alpha', _creationTime: 1000 },
    ];
    const map = buildInitiativeColorMap(initiatives);
    expect(map.get('a' as unknown as never)).toBe(INITIATIVE_COLOR_PALETTE[0]);
    expect(map.get('b' as unknown as never)).toBe(INITIATIVE_COLOR_PALETTE[1]);
  });
});

describe('getColorAtIndex', () => {
  it('returns palette colors for indices within palette range', () => {
    expect(getColorAtIndex(0)).toBe(INITIATIVE_COLOR_PALETTE[0]);
    expect(getColorAtIndex(INITIATIVE_COLOR_PALETTE.length - 1)).toBe(
      INITIATIVE_COLOR_PALETTE[INITIATIVE_COLOR_PALETTE.length - 1]
    );
  });

  it('generates unique HSL colors beyond palette length', () => {
    const colors = new Set(Array.from({ length: 35 }, (_, i) => getColorAtIndex(i)));
    expect(colors.size).toBe(35);
  });

  it('is stable for the same index', () => {
    expect(getColorAtIndex(5)).toBe(getColorAtIndex(5));
    expect(getColorAtIndex(40)).toBe(getColorAtIndex(40));
  });
});

describe('getInitiativeColorFromMap', () => {
  it('returns the color for an initiative in the map', () => {
    const map = new Map([['i1' as unknown as never, '#FF3B30']]);
    expect(getInitiativeColorFromMap('i1' as unknown as never, map)).toBe('#FF3B30');
  });

  it('returns fallback color for missing initiative', () => {
    const map = new Map();
    expect(getInitiativeColorFromMap('unknown' as unknown as never, map)).toBe(
      INITIATIVE_COLOR_PALETTE[0]
    );
  });
});
