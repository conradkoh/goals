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
 * Lightens an RGB color by increasing component values towards white.
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param factor - Multiplier for lightening (1.5 = 50% lighter)
 * @returns RGB color string
 */
function lightenColor(r: number, g: number, b: number, factor = 1.5): string {
  const lighten = (value: number) =>
    Math.min(255, Math.round(value + (255 - value) * (factor - 1)));
  return `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`;
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
    return isDarkMode ? DEFAULT_COLORS_DARK : DEFAULT_COLORS_LIGHT;
  }

  // Calculate luminance to determine if it's a light or dark color
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);

  if (isDarkMode) {
    // Dark mode: Use lighter text that contrasts with dark backgrounds
    // For light colors (high luminance), we can use the original or slightly saturated
    // For dark colors, we need to lighten them significantly
    const textColor =
      luminance > 0.4
        ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` // Light colors: use original
        : lightenColor(rgb.r, rgb.g, rgb.b, 1.5); // Dark colors: lighten by 50%

    return {
      foreground: textColor,
      background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`, // Slightly less opacity for dark mode
      border: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
      dotColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    };
  }

  // Light mode: Darken text for light colors to ensure contrast
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
