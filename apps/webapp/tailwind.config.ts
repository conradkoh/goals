import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* V2 Industrial: Using CSS variables directly (hex/rgba format) */
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        chart: {
          '1': 'var(--chart-1)',
          '2': 'var(--chart-2)',
          '3': 'var(--chart-3)',
          '4': 'var(--chart-4)',
          '5': 'var(--chart-5)',
        },
        /* V2 Industrial: Status colors */
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        info: 'var(--info)',
      },
      /* V2 Industrial: Sharp corners - all radii set to 0 */
      borderRadius: {
        lg: '0',
        md: '0',
        sm: '0',
        DEFAULT: '0',
      },
      /* V2 Industrial: Custom font sizes for micro text */
      fontSize: {
        micro: ['9px', { lineHeight: '1.2', fontWeight: '700' }],
        label: ['10px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '0.05em' }],
      },
      /* V2 Industrial: Wide tracking for uppercase text */
      letterSpacing: {
        industrial: '0.05em',
      },
      /* V2 Industrial: Thick borders */
      borderWidth: {
        industrial: '2px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
