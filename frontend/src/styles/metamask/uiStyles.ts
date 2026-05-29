import type { CSSProperties } from 'react';
import { METAMASK_FONT_FAMILY, metamaskTokens, type MetamaskThemeTokens } from './tokens';

export type MetamaskUi = {
    pageMain: CSSProperties;
    container: CSSProperties;
    hero: CSSProperties;
    heroSection: CSSProperties;
    section: CSSProperties;
    sectionFirst: CSSProperties;
    navGrid: CSSProperties;
    navLink: CSSProperties;
    pill: CSSProperties;
    title: CSSProperties;
    subtitle: CSSProperties;
    bodyMuted: CSSProperties;
    primaryButton: CSSProperties;
    primaryButtonSm: CSSProperties;
    primaryButtonDisabled: CSSProperties;
    secondaryButton: CSSProperties;
    input: CSSProperties;
    label: CSSProperties;
    errorBox: CSSProperties;
    monoNote: CSSProperties;
    monoInline: CSSProperties;
    h1Flat: CSSProperties;
    h2InSection: CSSProperties;
    networkBannerSection: CSSProperties;
    lottoInstanceLink: (opts: { nearFull: boolean }) => CSSProperties;
    lottoInstanceTitle: CSSProperties;
    lottoInstanceLine: CSSProperties;
    lottoInstanceLineTight: CSSProperties;
    lottoHighlightNote: CSSProperties;
};

function sectionBase(t: MetamaskThemeTokens, marginTop: number): CSSProperties {
    return {
        marginTop,
        padding: 20,
        border: t.sectionBorder,
        borderRadius: 14,
        background: t.sectionBackground,
    };
}

const heroStyle: CSSProperties = {
    marginTop: 0,
    padding: 16,
    border: '1px solid rgba(255, 177, 85, 0.32)',
    borderRadius: 10,
    background: metamaskTokens.heroBackground,
    textAlign: 'center',
    maxWidth: 560,
    marginInline: 'auto',
};

export function createMetamaskUi(): MetamaskUi {
    const t = metamaskTokens;

    const primaryBase: CSSProperties = {
        padding: '11px 16px',
        borderRadius: 10,
        fontWeight: 700,
        ...t.primaryButton,
    };

    const primarySm: CSSProperties = {
        padding: '10px 14px',
        borderRadius: 10,
        cursor: 'pointer',
        ...t.primaryButton,
    };

    return {
        pageMain: {
            minHeight: 'auto',
            padding: '10px 16px 16px',
            background: t.pageBackground,
            fontFamily: METAMASK_FONT_FAMILY,
            color: t.text,
            display: 'grid',
            alignItems: 'start',
        },
        container: { maxWidth: 920, margin: '0 auto' },
        hero: heroStyle,
        heroSection: heroStyle,
        sectionFirst: sectionBase(t, 0),
        section: sectionBase(t, 16),
        pill: {
            display: 'inline-block',
            margin: 0,
            padding: '4px 10px',
            border: '1px solid #ffb155',
            borderRadius: 999,
            background: t.pillBackground,
            color: t.pillText,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
        },
        title: {
            margin: '12px 0 0',
            fontSize: 'clamp(2rem, 3.2vw, 2.8rem)',
            lineHeight: 1.18,
            color: '#ffe8c8',
            fontWeight: 400,
        },
        subtitle: {
            margin: '6px auto 0',
            maxWidth: 500,
            color: t.textMuted,
            lineHeight: 1.5,
            textAlign: 'center',
        },
        bodyMuted: {
            marginTop: 10,
            color: t.textMuted,
        },
        navGrid: {
            marginTop: 0,
            padding: 0,
            border: 'none',
            borderRadius: 0,
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
        },
        navLink: {
            display: 'block',
            textAlign: 'center',
            padding: '9px 12px',
            borderRadius: 10,
            width: 'fit-content',
            minWidth: 240,
            marginInline: 'auto',
            border: '1px solid #ff4fa7',
            background: 'transparent',
            color: '#ff9bcf',
            boxShadow: '0 0 10px rgba(255, 79, 167, 0.24)',
            fontWeight: 300,
            fontSize: '0.92rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            textDecoration: 'none',
        },
        primaryButton: {
            ...primaryBase,
            cursor: 'pointer',
        },
        primaryButtonSm: primarySm,
        primaryButtonDisabled: {
            ...primaryBase,
            cursor: 'not-allowed',
            opacity: 0.5,
        },
        secondaryButton: {
            marginTop: 10,
            padding: '10px 14px',
            borderRadius: 10,
            cursor: 'pointer',
            ...t.secondaryButton,
        },
        input: {
            width: '100%',
            marginTop: 8,
            padding: '11px 12px',
            borderRadius: 10,
            ...t.input,
        },
        label: {
            display: 'block',
            marginBottom: 12,
            color: t.textMuted,
        },
        errorBox: {
            marginTop: 12,
            ...t.errorBox,
        },
        monoNote: {
            marginTop: 20,
            ...t.monoMuted,
        },
        monoInline: {
            marginTop: 12,
            fontFamily: 'ui-monospace, Menlo, monospace',
            wordBreak: 'break-all',
            color: t.textSubtle,
        },
        h1Flat: {
            margin: 0,
            color: '#ffe8c8',
            fontWeight: 400,
        },
        h2InSection: {
            marginTop: 0,
            color: '#ffe8c8',
            fontWeight: 400,
        },
        networkBannerSection: {
            marginTop: 16,
            padding: 20,
            border: t.sectionBorder,
            borderRadius: 14,
            background: 'rgba(255, 177, 85, 0.08)',
        },
        lottoInstanceLink: ({ nearFull }) => ({
            display: 'block',
            border: nearFull ? t.lottoCard.borderHighlight : t.lottoCard.borderDefault,
            borderRadius: 10,
            padding: '12px 14px',
            color: t.lottoCard.titleColor,
            textDecoration: 'none',
            wordBreak: 'break-all',
            background: t.lottoCard.background,
        }),
        lottoInstanceTitle: {
            margin: 0,
            textDecoration: 'underline',
        },
        lottoInstanceLine: {
            margin: '8px 0 0',
            color: t.lottoCard.lineColor,
        },
        lottoInstanceLineTight: {
            margin: '4px 0 0',
            color: t.lottoCard.lineColor,
        },
        lottoHighlightNote: {
            margin: '8px 0 0',
            color: t.lottoCard.highlightNote,
        },
    };
}
