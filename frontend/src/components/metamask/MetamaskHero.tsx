'use client';

import type { ReactNode } from 'react';
import type { MetamaskUi } from '@/styles/metamask/uiStyles';

type Props = {
    ui: MetamaskUi;
    pill: string;
    title: string;
    children?: ReactNode;
};

export function MetamaskHero({ ui, pill, title, children }: Props) {
    return (
        <section style={ui.heroSection}>
            <p style={ui.pill}>{pill}</p>
            <h1 style={ui.title}>{title}</h1>
            {children}
        </section>
    );
}
