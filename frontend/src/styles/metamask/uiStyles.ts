import type { CSSProperties } from 'react';
import { METAMASK_FONT_FAMILY, type MetamaskThemeTokens, getMetamaskTokens, type MetamaskVisualVariant } from './tokens';

export type MetamaskUi = {
    pageMain: CSSProperties;
    container: CSSProperties;
    section: CSSProperties;
    sectionFirst: CSSProperties;
    heroSection: CSSProperties;
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

export function createMetamaskUi(variant: MetamaskVisualVariant): MetamaskUi {
    const t = getMetamaskTokens(variant);

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
            minHeight: '100dvh',
            padding: '28px 16px 44px',
            background: t.pageBackground,
            fontFamily: METAMASK_FONT_FAMILY,
            color: t.text,
        },
        container: {
            maxWidth: 920,
            margin: '0 auto',
        },
        section: sectionBase(t, 16),
        sectionFirst: sectionBase(t, 0),
        heroSection: {
            marginTop: 0,
            padding: 20,
            border: t.sectionBorder,
            borderRadius: 14,
            background: t.heroBackground,
        },
        navGrid: {
            marginTop: 24,
            padding: 20,
            border: variant === 'warm' ? '1px solid #5b4832' : t.sectionBorder,
            borderRadius: 14,
            background: t.sectionBackgroundAlt,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
        },
        navLink: {
            display: 'block',
            textAlign: 'center',
            padding: '12px 16px',
            borderRadius: 10,
            fontWeight: 700,
            letterSpacing: 0.2,
            textDecoration: 'none',
            ...t.primaryButton,
        },
        pill: {
            display: 'inline-block',
            margin: 0,
            padding: '4px 10px',
            borderRadius: 999,
            background: t.pillBackground,
            color: t.pillText,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
        },
        title: {
            margin: '12px 0 0',
            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
            lineHeight: 1.18,
        },
        subtitle: {
            marginTop: 12,
            color: t.textMuted,
            lineHeight: 1.55,
        },
        bodyMuted: {
            marginTop: 10,
            color: t.textMuted,
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
            color: variant === 'warm' ? t.textMuted : '#d6ebef',
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
            color: variant === 'warm' ? t.textMuted : t.textSubtle,
        },
        h1Flat: {
            margin: 0,
        },
        h2InSection: {
            marginTop: 0,
        },
        networkBannerSection: {
            marginTop: 16,
            padding: 20,
            border: t.sectionBorder,
            borderRadius: 14,
            background: variant === 'warm' ? 'rgba(63, 37, 14, 0.72)' : t.sectionBackground,
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
