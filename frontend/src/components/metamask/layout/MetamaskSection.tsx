'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { MetamaskUi } from '@/styles/metamask/uiStyles';

type Props = {
    ui: MetamaskUi;
    first?: boolean;
    children: ReactNode;
    style?: CSSProperties;
};

export function MetamaskSection({ ui, first, children, style }: Props) {
    const base = first ? ui.sectionFirst : ui.section;
    return <section style={style ? { ...base, ...style } : base}>{children}</section>;
}
