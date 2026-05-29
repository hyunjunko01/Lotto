'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMetamaskUi } from '@/components/metamask/layout/useMetamaskUi';
import flowLayout from '@/components/metamask/layout/metamaskFlowLayout.module.css';

type Props = {
    hero: ReactNode;
    children: ReactNode;
    backHref?: string;
    backLabel?: string;
};

export function MetaMaskFlowPage({
    hero,
    children,
    backHref = '/metamask',
    backLabel = '← Back to MetaMask Home',
}: Props) {
    const ui = useMetamaskUi();

    return (
        <main style={ui.pageMain} className={flowLayout.pageMain}>
            <div style={ui.container} className={flowLayout.container}>
                <div className={flowLayout.heroStack}>
                    <Link href={backHref} className={flowLayout.backLink}>
                        {backLabel}
                    </Link>
                    {hero}
                </div>
                {children}
            </div>
        </main>
    );
}
