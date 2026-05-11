import type { CSSProperties } from 'react';

export const AA_FONT_FAMILY = "'Avenir Next', 'IBM Plex Sans', 'Segoe UI', sans-serif" as const;

export type AATokens = {
  pageBackground: string;
  text: string;
  mutedText: string;
  sectionBorder: string;
  heroBackground: string;
  sectionBackground: string;
  navBackground: string;
  pillBackground: string;
  pillText: string;
  primaryLink: Pick<CSSProperties, 'border' | 'background' | 'color'>;
  warningText: string;
  errorBox: Pick<CSSProperties, 'color' | 'background' | 'border'>;
};

export const aaTokens: AATokens = {
  pageBackground:
    'radial-gradient(1200px 500px at 10% -10%, rgba(22, 86, 102, 0.4), transparent), linear-gradient(180deg, #07161c 0%, #0b101a 100%)',
  text: '#e8f2f4',
  mutedText: '#b8cdcf',
  sectionBorder: '1px solid #2d3f45',
  heroBackground: 'linear-gradient(160deg, rgba(10, 35, 44, 0.92), rgba(12, 20, 30, 0.9))',
  sectionBackground: 'rgba(7, 19, 24, 0.72)',
  navBackground: 'rgba(7, 19, 24, 0.72)',
  pillBackground: '#153740',
  pillText: '#9fd6df',
  primaryLink: {
    border: '1px solid #76b4be',
    background: 'linear-gradient(135deg, #0f7f8f, #155a8a)',
    color: '#ecf8ff',
  },
  warningText: '#ffc2b6',
  errorBox: {
    color: '#ffd3cb',
    background: 'rgba(127, 39, 39, 0.26)',
    border: '1px solid #924747',
  },
};
