import type { CSSProperties } from 'react';
import { AA_FONT_FAMILY, aaTokens } from './tokens';

export type AAUi = {
  pageMain: CSSProperties;
  container: CSSProperties;
  hero: CSSProperties;
  section: CSSProperties;
  sectionFirst: CSSProperties;
  pill: CSSProperties;
  title: CSSProperties;
  subtitle: CSSProperties;
  navGrid: CSSProperties;
  navLink: CSSProperties;
  warningText: CSSProperties;
  errorBox: CSSProperties;
};

export function createAAUi(): AAUi {
  const t = aaTokens;

  return {
    pageMain: {
      minHeight: '100dvh',
      padding: '28px 16px 44px',
      background: t.pageBackground,
      fontFamily: AA_FONT_FAMILY,
      color: t.text,
    },
    container: { maxWidth: 920, margin: '0 auto' },
    hero: {
      marginTop: 0,
      padding: 20,
      border: '1px solid #3e5a60',
      borderRadius: 14,
      background: t.heroBackground,
    },
    sectionFirst: {
      marginTop: 0,
      padding: 20,
      border: t.sectionBorder,
      borderRadius: 14,
      background: t.sectionBackground,
    },
    section: {
      marginTop: 16,
      padding: 20,
      border: t.sectionBorder,
      borderRadius: 14,
      background: t.sectionBackground,
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
    title: { margin: '12px 0 0', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', lineHeight: 1.18 },
    subtitle: { marginTop: 12, color: t.mutedText, lineHeight: 1.55 },
    navGrid: {
      marginTop: 24,
      padding: 20,
      border: t.sectionBorder,
      borderRadius: 14,
      background: t.navBackground,
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
      ...t.primaryLink,
    },
    warningText: { color: t.warningText },
    errorBox: {
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      ...t.errorBox,
    },
  };
}
