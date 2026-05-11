'use client';

import Link from 'next/link';
import { MetamaskHero } from '@/components/metamask/MetamaskHero';
import { useMetamaskUi } from '@/components/metamask/useMetamaskUi';

export default function MetamaskHomePage() {
    const ui = useMetamaskUi('warm');

    return (
        <main style={ui.pageMain}>
            <div style={ui.container}>
                <MetamaskHero ui={ui} pill="MetaMask Mode" title="EOA Transaction Workspace">
                    <p style={ui.subtitle}>
                        Connect your wallet from the top button, then continue with the standard EOA transaction flow.
                    </p>
                </MetamaskHero>

                <section style={ui.navGrid}>
                    <Link href="/metamask/create-lottery" style={ui.navLink}>
                        Create Lottery
                    </Link>
                    <Link href="/metamask/join-lottery" style={ui.navLink}>
                        Join Lottery
                    </Link>
                    <Link href="/metamask/faucet" style={ui.navLink}>
                        Token Faucet
                    </Link>
                </section>
            </div>
        </main>
    );
}
