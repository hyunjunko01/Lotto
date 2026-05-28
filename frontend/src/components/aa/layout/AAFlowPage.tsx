'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import flowLayout from '@/components/aa/layout/aaFlowLayout.module.css';

type Props = {
    hero: ReactNode;
    children: ReactNode;
};

export function AAFlowPage({ hero, children }: Props) {
    const ui = useAAUi();

    return (
        <main style={ui.pageMain} className={flowLayout.pageMain}>
            <div style={ui.container} className={flowLayout.container}>
                <div className={flowLayout.heroStack}>
                    <Link href="/aa" className={flowLayout.backLink}>
                        ← Back to AA Home
                    </Link>
                    {hero}
                </div>
                {children}
            </div>
        </main>
    );
}
