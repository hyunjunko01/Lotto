'use client';

import Link from 'next/link';
import { MetamaskHero } from '@/components/metamask/layout/MetamaskHero';
import flowLayout from '@/components/metamask/layout/metamaskFlowLayout.module.css';
import { useMetamaskUi } from '@/components/metamask/layout/useMetamaskUi';
import styles from './page.module.css';

export default function MetamaskHomePage() {
    const ui = useMetamaskUi();

    return (
        <main className={styles.page}>
            <div className={flowLayout.container}>
                <div className={flowLayout.heroStack}>
                    <MetamaskHero ui={ui} pill="MetaMask Mode" title="Quick Start" className={flowLayout.hero}>
                        <ol className={styles.guideList}>
                            <li>Connect your wallet from the header.</li>
                            <li>Open faucet first if you need test tokens.</li>
                            <li>Create or join a lottery from the menu.</li>
                        </ol>
                    </MetamaskHero>

                    <section className={styles.navCard}>
                        <div className={styles.navGrid}>
                            <Link href="/metamask/create-lottery" className={styles.navLink}>
                                MetaMask Create Lottery
                            </Link>
                            <Link href="/metamask/join-lottery" className={styles.navLink}>
                                MetaMask Join Lottery
                            </Link>
                            <Link href="/metamask/faucet" className={styles.navLink}>
                                MetaMask Token Faucet
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
