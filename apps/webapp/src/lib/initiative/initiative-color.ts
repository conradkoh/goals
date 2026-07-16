import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';

/** Minimum palette size. */
// fallow-ignore-next-line unused-export
export const INITIATIVE_PALETTE_MIN_SIZE = 30;

/** Curated distinct accessible colors — 30 hues with good contrast on light/dark themes. */
// fallow-ignore-next-line unused-export
export const INITIATIVE_COLOR_PALETTE: readonly string[] = [
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
  '#E74C3C',
  '#F39C12',
  '#2ECC71',
  '#1ABC9C',
  '#3498DB',
  '#9B59B6',
  '#E91E63',
  '#795548',
  '#FF7043',
  '#66BB6A',
  '#26C6DA',
  '#42A5F5',
  '#AB47BC',
  '#EC407A',
  '#8D6E63',
  '#78909C',
  '#7CB342',
  '#00ACC1',
] as const;

function hslToHex(h: number, s: number, l: number): string {
  const saturation = s / 100;
  const lightness = l / 100;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lightness - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Returns a unique color at sequential index; uses palette for 0..palette.length-1, generates HSL golden-angle hues beyond. */
// fallow-ignore-next-line unused-export
export function getColorAtIndex(index: number): string {
  if (index < INITIATIVE_COLOR_PALETTE.length) {
    return INITIATIVE_COLOR_PALETTE[index];
  }
  const hue = (index * 137.508) % 360;
  return hslToHex(hue, 65, 48);
}

function sortInitiativesForColorAllocation(
  initiatives: Pick<Doc<'initiatives'>, '_id' | 'title' | '_creationTime'>[]
): Pick<Doc<'initiatives'>, '_id' | 'title' | '_creationTime'>[] {
  return [...initiatives].sort(
    (a, b) => a._creationTime - b._creationTime || a.title.localeCompare(b.title)
  );
}

/** Assigns unique colors sequentially by creation order. */
export function buildInitiativeColorMap(
  initiatives: Pick<Doc<'initiatives'>, '_id' | 'title' | '_creationTime'>[]
): Map<Id<'initiatives'>, string> {
  const sorted = sortInitiativesForColorAllocation(initiatives);
  const map = new Map<Id<'initiatives'>, string>();
  sorted.forEach((initiative, index) => {
    map.set(initiative._id, getColorAtIndex(index));
  });
  return map;
}

/** Looks up color from map with first-palette fallback. */
export function getInitiativeColorFromMap(
  initiativeId: Id<'initiatives'>,
  colorMap: Map<Id<'initiatives'>, string>
): string {
  return colorMap.get(initiativeId) ?? INITIATIVE_COLOR_PALETTE[0];
}
