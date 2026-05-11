'use client';

import type { ReactNode } from 'react';
import type { AAUi } from '@/styles/aa/uiStyles';

type Props = {
  ui: AAUi;
  pill: string;
  title: string;
  children?: ReactNode;
};

export function AAHero({ ui, pill, title, children }: Props) {
  return (
    <section style={ui.hero}>
      <p style={ui.pill}>{pill}</p>
      <h1 style={ui.title}>{title}</h1>
      {children}
    </section>
  );
}
