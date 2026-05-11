'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { AAUi } from '@/styles/aa/uiStyles';

type Props = {
  ui: AAUi;
  first?: boolean;
  style?: CSSProperties;
  children: ReactNode;
};

export function AASection({ ui, first, style, children }: Props) {
  const base = first ? ui.sectionFirst : ui.section;
  return <section style={style ? { ...base, ...style } : base}>{children}</section>;
}
