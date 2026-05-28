'use client';

import Link from 'next/link';
import { MetamaskFaucetWorkspace } from '@/components/metamask/workspace/MetamaskFaucetWorkspace';
import { useMetamaskUi } from '@/components/metamask/layout/useMetamaskUi';
import { getMetamaskTokens } from '@/styles/metamask/tokens';

export default function MetamaskFaucetPage() {
    const ui = useMetamaskUi('warm');
    const t = getMetamaskTokens('warm');

    return (
        <main style={ui.pageMain}>
            <div style={ui.container}>
                <Link
                    href="/metamask"
                    style={{
                        display: 'inline-flex',
                        marginBottom: 14,
                        color: '#8fe8ff',
                        textDecoration: 'underline',
                        fontWeight: 700,
                    }}
                >
                    ← Back to MetaMask Home
                </Link>
                <MetamaskFaucetWorkspace ui={ui} t={t} />
            </div>
        </main>
    );
}
