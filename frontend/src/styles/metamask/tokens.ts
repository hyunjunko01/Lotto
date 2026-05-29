import type { CSSProperties } from 'react';

/** Shared font stack for MetaMask-mode pages */
export const METAMASK_FONT_FAMILY =
    "'Avenir Next', 'IBM Plex Sans', 'Segoe UI', sans-serif" as const;

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

export const metamaskTokens: MetamaskThemeTokens = {
    pageBackground: '#000000',
    text: '#ffe8c8',
    textMuted: '#e8c98a',
    textSubtle: '#d4b87a',
    sectionBorder: '1px solid rgba(255, 177, 85, 0.32)',
    sectionBackground: 'rgba(0, 0, 0, 0.72)',
    sectionBackgroundAlt: 'rgba(0, 0, 0, 0.72)',
    heroBackground: 'rgba(0, 0, 0, 0.72)',
    pillBackground: 'rgba(255, 177, 85, 0.12)',
    pillText: '#ffd49a',
    primaryButton: {
        border: '1px solid #ffb155',
        background: 'linear-gradient(135deg, #c37a2c, #8d4f24)',
        color: '#fff7ef',
    },
    secondaryButton: {
        border: '1px solid rgba(255, 177, 85, 0.45)',
        background: 'rgba(255, 177, 85, 0.08)',
        color: '#ffd49a',
    },
    input: {
        border: '1px solid rgba(255, 177, 85, 0.35)',
        background: '#0f0a04',
        color: '#ffe8c8',
    },
    warnText: '#ffc2b6',
    successText: '#b5f3c9',
    errorBox: {
        color: '#ffd3cb',
        background: 'rgba(127, 39, 39, 0.26)',
        border: '1px solid #924747',
        borderRadius: 10,
        padding: '10px 12px',
    },
    monoMuted: {
        color: '#d4b87a',
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: 12,
        wordBreak: 'break-all',
    },
    lottoCard: {
        borderDefault: '1px solid rgba(255, 177, 85, 0.28)',
        borderHighlight: '1px solid #ffb155',
        background: 'rgba(0, 0, 0, 0.65)',
        titleColor: '#ffd49a',
        lineColor: '#e8c98a',
        highlightNote: '#ffe08a',
    },
};

export function getMetamaskTokens(): MetamaskThemeTokens {
    return metamaskTokens;
}
