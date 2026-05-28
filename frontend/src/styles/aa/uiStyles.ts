import type { CSSProperties } from 'react';
import { AA_FONT_FAMILY } from './tokens';

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
  return {
    pageMain: {
      minHeight: 'auto',
      padding: '10px 16px 16px',
      background: '#000000',
      fontFamily: AA_FONT_FAMILY,
      color: '#d8f7ff',
      display: 'grid',
      alignItems: 'start',
    },
    container: { maxWidth: 920, margin: '0 auto' },
    hero: {
      marginTop: 0,
      padding: 16,
      border: '1px solid rgba(78, 226, 255, 0.32)',
      borderRadius: 10,
      background: 'rgba(0, 0, 0, 0.72)',
      textAlign: 'center',
      maxWidth: 560,
      marginInline: 'auto',
    },
    sectionFirst: {
      marginTop: 0,
      padding: 20,
      border: '1px solid rgba(78, 226, 255, 0.28)',
      borderRadius: 14,
      background: 'rgba(0, 0, 0, 0.62)',
    },
    section: {
      marginTop: 16,
      padding: 20,
      border: '1px solid rgba(78, 226, 255, 0.24)',
      borderRadius: 14,
      background: 'rgba(0, 0, 0, 0.6)',
    },
    pill: {
      display: 'inline-block',
      margin: 0,
      padding: '4px 10px',
      border: '1px solid #4ee2ff',
      borderRadius: 999,
      background: 'rgba(78, 226, 255, 0.1)',
      color: '#9df1ff',
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    title: {
      margin: '12px 0 0',
      fontSize: 'clamp(2rem, 3.2vw, 2.8rem)',
      lineHeight: 1.18,
      color: '#c9f8ff',
      fontWeight: 400,
    },
    subtitle: {
      margin: '6px auto 0',
      maxWidth: 500,
      color: '#88dceb',
      lineHeight: 1.5,
      textAlign: 'center',
    },
    navGrid: {
      marginTop: 18,
      padding: 0,
      border: 'none',
      borderRadius: 0,
      background: 'transparent',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      maxWidth: 560,
      marginInline: 'auto',
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
    warningText: { color: '#ffc8b3' },
    errorBox: {
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      border: '1px solid rgba(255, 137, 137, 0.45)',
      background: 'rgba(56, 14, 14, 0.45)',
      color: '#ffc2c2',
    },
  };
}
