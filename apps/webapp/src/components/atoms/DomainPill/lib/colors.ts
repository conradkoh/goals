/**
 * Color configuration for domain pill styling.
 */
export interface DomainPillColors {
  foreground: string;
  background: string;
  border: string;
  dotColor: string;
}

/**
 * Converts hex color string to RGB values.
 * @param hex - Hex color string (with or without # prefix)
 * @returns RGB values or null if invalid format
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculates the relative luminance of an RGB color.
 * Uses the WCAG formula for determining perceived brightness.
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Relative luminance value (0-1)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : ((sRGB + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Darkens an RGB color by reducing component values.
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param factor - Multiplier for darkening (default 0.6 = 60% darker)
 * @returns RGB color string
 */
function darkenColor(r: number, g: number, b: number, factor = 0.6): string {
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

/**
 * Default colors for uncategorized domains (gray theme) - Light mode.
 */
const DEFAULT_COLORS_LIGHT: DomainPillColors = {
  foreground: 'rgb(55, 65, 81)', // gray-700
  background: 'rgb(243, 244, 246)', // gray-100
  border: 'rgb(229, 231, 235)', // gray-200
  dotColor: 'rgb(107, 114, 128)', // gray-500
};

/**
 * Default colors for uncategorized domains (gray theme) - Dark mode.
 */
const DEFAULT_COLORS_DARK: DomainPillColors = {
  foreground: 'rgb(209, 213, 219)', // gray-300
  background: 'rgb(31, 41, 55)', // gray-800
  border: 'rgb(55, 65, 81)', // gray-700
  dotColor: 'rgb(156, 163, 175)', // gray-400
};

/**
 * Generates color variations for domain pill styling.
 * Creates accessible foreground/background combinations based on the base color's luminance.
 * @param domainColor - Hex color string for the domain
 * @param isDarkMode - Whether the app is in dark mode
 * @returns Color configuration for pill styling
 */
export function getDomainPillColors(domainColor?: string, isDarkMode = false): DomainPillColors {
  if (!domainColor) {
    return isDarkMode ? DEFAULT_COLORS_DARK : DEFAULT_COLORS_LIGHT;
  }

  const rgb = hexToRgb(domainColor);
  if (!rgb) {
    return {
      foreground: '#000000',
      background: domainColor,
      border: domainColor,
      dotColor: '#000000',
    };
  }

  // Calculate luminance to determine if it's a light or dark color
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);

  // For light colors (luminance > 0.5), darken the text significantly for contrast
  // For dark colors, use the original color for text
  const textColor =
    luminance > 0.5
      ? darkenColor(rgb.r, rgb.g, rgb.b, 0.4) // Darken to 40% for light colors
      : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`; // Use original for dark colors

  return {
    foreground: textColor,
    background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`,
    border: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`,
    dotColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
  };
}
