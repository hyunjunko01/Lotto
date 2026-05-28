'use client';

import type { ReactNode } from 'react';
import type { AAUi } from '@/styles/aa/uiStyles';

type Props = {
  ui: AAUi;
  pill: string;
  title: string;
  className?: string;
  children?: ReactNode;
};

export function AAHero({ ui, pill, title, className, children }: Props) {
  return (
    <section style={ui.hero} className={className}>
      <p style={ui.pill}>{pill}</p>
      <h1 style={ui.title}>{title}</h1>
      {children}
    </section>
  );
}
