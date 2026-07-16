/**
 * Curated initiative palette — distinct hues with sufficient contrast on light/dark UI.
 * Aligned with domain color presets; gray omitted to maximize visual separation.
 */
const INITIATIVE_COLOR_PALETTE = [
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#34C759', // Green
  '#00C7BE', // Mint
  '#30B0C7', // Teal
  '#32ADE6', // Cyan
  '#007AFF', // Blue
  '#5856D6', // Indigo
  '#AF52DE', // Purple
  '#FF2D55', // Pink
  '#A2845E', // Brown
] as const;

function normalizeInitiativeTitleForColor(title: string): string {
  return title.trim().toLowerCase();
}

/** FNV-1a 32-bit hash — fast, deterministic, good distribution for short strings. */
function hashStringToIndex(input: string, modulo: number): number {
  let hash = 2_166_136_261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % modulo;
}

/** Returns a stable hex color for the given initiative title. */
export function getInitiativeColorFromTitle(title: string): string {
  const normalized = normalizeInitiativeTitleForColor(title);
  if (!normalized) {
    return INITIATIVE_COLOR_PALETTE[0];
  }
  const index = hashStringToIndex(normalized, INITIATIVE_COLOR_PALETTE.length);
  return INITIATIVE_COLOR_PALETTE[index];
}
