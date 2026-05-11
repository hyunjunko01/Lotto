import type { CSSProperties } from 'react';

/** Shared font stack for MetaMask-mode pages */
export const METAMASK_FONT_FAMILY =
    "'Avenir Next', 'IBM Plex Sans', 'Segoe UI', sans-serif" as const;

export type MetamaskVisualVariant = 'warm' | 'teal';

export type MetamaskThemeTokens = {
    pageBackground: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    sectionBorder: string;
    sectionBackground: string;
    sectionBackgroundAlt: string;
    heroBackground: string;
    pillBackground: string;
    pillText: string;
    primaryButton: Pick<CSSProperties, 'border' | 'background' | 'color'>;
    secondaryButton: Pick<CSSProperties, 'border' | 'background' | 'color'>;
    input: Pick<CSSProperties, 'border' | 'background' | 'color'>;
    warnText: string;
    successText: string;
    errorBox: Pick<CSSProperties, 'color' | 'background' | 'border' | 'borderRadius' | 'padding'>;
    monoMuted: Pick<CSSProperties, 'color' | 'fontFamily' | 'fontSize' | 'wordBreak'>;
    lottoCard: {
        borderDefault: string;
        borderHighlight: string;
        background: string;
        titleColor: string;
        lineColor: string;
        highlightNote: string;
    };
};

const warmPrimaryButton: MetamaskThemeTokens['primaryButton'] = {
    border: '1px solid #c39363',
    background: 'linear-gradient(135deg, #c37a2c, #8d4f24)',
    color: '#fff7ef',
};

const tealPrimaryButton: MetamaskThemeTokens['primaryButton'] = {
    border: '1px solid #76b4be',
    background: 'linear-gradient(135deg, #0f7f8f, #155a8a)',
    color: '#ecf8ff',
};

export const metamaskWarmTokens: MetamaskThemeTokens = {
    pageBackground:
        'radial-gradient(1200px 500px at 10% -10%, rgba(112, 69, 22, 0.42), transparent), linear-gradient(180deg, #191006 0%, #1c1209 100%)',
    text: '#f7ece2',
    textMuted: '#f3d9bf',
    textSubtle: '#e8d4c4',
    sectionBorder: '1px solid #6f4b2f',
    sectionBackground: 'linear-gradient(160deg, rgba(58, 31, 12, 0.9), rgba(30, 18, 10, 0.92))',
    sectionBackgroundAlt: 'rgba(35, 21, 8, 0.5)',
    heroBackground: 'linear-gradient(160deg, rgba(58, 31, 12, 0.9), rgba(30, 18, 10, 0.92))',
    pillBackground: '#50301c',
    pillText: '#ffd9b3',
    primaryButton: warmPrimaryButton,
    secondaryButton: {
        border: '1px solid #5d7980',
        background: '#13242a',
        color: '#d9eef1',
    },
    input: {
        border: '1px solid #4a3d2e',
        background: '#2a1f14',
        color: '#f7ece2',
    },
    warnText: '#ffd8c7',
    successText: '#b5f3c9',
    errorBox: {
        color: '#ffd3cb',
        background: 'rgba(127, 39, 39, 0.34)',
        border: '1px solid #924747',
        borderRadius: 10,
        padding: '10px 12px',
    },
    monoMuted: {
        color: '#d8c4b0',
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: 12,
        wordBreak: 'break-all',
    },
    lottoCard: {
        borderDefault: '1px solid #5b4832',
        borderHighlight: '1px solid #f3b86f',
        background: 'rgba(45, 28, 12, 0.72)',
        titleColor: '#ffcc8a',
        lineColor: '#f3d9bf',
        highlightNote: '#ffd59a',
    },
};

export const metamaskTealTokens: MetamaskThemeTokens = {
    pageBackground:
        'radial-gradient(1200px 500px at 10% -10%, rgba(22, 86, 102, 0.4), transparent), linear-gradient(180deg, #07161c 0%, #0b101a 100%)',
    text: '#e8f2f4',
    textMuted: '#c6dfe2',
    textSubtle: '#d4eaee',
    sectionBorder: '1px solid #2d3f45',
    sectionBackground: 'rgba(7, 19, 24, 0.72)',
    sectionBackgroundAlt: 'rgba(7, 19, 24, 0.55)',
    heroBackground: 'linear-gradient(160deg, rgba(10, 35, 44, 0.92), rgba(12, 20, 30, 0.9))',
    pillBackground: '#153740',
    pillText: '#9fd6df',
    primaryButton: tealPrimaryButton,
    secondaryButton: {
        border: '1px solid #5d7980',
        background: '#13242a',
        color: '#d9eef1',
    },
    input: {
        border: '1px solid #3a4e53',
        background: '#0c1f26',
        color: '#e7f2f2',
    },
    warnText: '#ffc2b6',
    successText: '#9ff2be',
    errorBox: {
        color: '#ffd3cb',
        background: 'rgba(127, 39, 39, 0.34)',
        border: '1px solid #924747',
        borderRadius: 10,
        padding: '10px 12px',
    },
    monoMuted: {
        color: '#a4bcc0',
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: 12,
        wordBreak: 'break-all',
    },
    lottoCard: {
        borderDefault: '1px solid #31525b',
        borderHighlight: '1px solid #f3b86f',
        background: 'rgba(8, 22, 30, 0.7)',
        titleColor: '#8fe8ff',
        lineColor: '#d4eaee',
        highlightNote: '#ffd59a',
    },
};

export function getMetamaskTokens(variant: MetamaskVisualVariant): MetamaskThemeTokens {
    return variant === 'warm' ? metamaskWarmTokens : metamaskTealTokens;
}
