'use client';

import Link from 'next/link';
import { MetamaskCreateLotteryWorkspace } from '@/components/metamask/workspace/MetamaskCreateLotteryWorkspace';
import { useMetamaskUi } from '@/components/metamask/layout/useMetamaskUi';
import { getMetamaskTokens } from '@/styles/metamask/tokens';

export default function CreateLotteryPage() {
    const ui = useMetamaskUi('teal');
    const t = getMetamaskTokens('teal');

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
                <MetamaskCreateLotteryWorkspace ui={ui} t={t} />
            </div>
        </main>
    );
}
