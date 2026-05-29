'use client';

import type { ReactNode } from 'react';
import type { MetamaskUi } from '@/styles/metamask/uiStyles';

type Props = {
    ui: MetamaskUi;
    pill: string;
    title: string;
    className?: string;
    children?: ReactNode;
};

export function MetamaskHero({ ui, pill, title, className, children }: Props) {
    return (
        <section style={ui.hero} className={className}>
            <p style={ui.pill}>{pill}</p>
            <h1 style={ui.title}>{title}</h1>
            {children}
        </section>
    );
}
