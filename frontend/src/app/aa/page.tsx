'use client';

import Link from 'next/link';
import { AAHero } from '@/components/aa/layout/AAHero';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import styles from './page.module.css';

export default function AAHomePage() {
  const ui = useAAUi();

  return (
    <main style={ui.pageMain}>
      <div style={ui.container} className={styles.panel}>
        <div>
          <AAHero ui={ui} pill="AA Mode" title="Quick Start">
            <ol className={styles.guideList}>
              <li>Log in with social login through Web3Auth.</li>
              <li>Open faucet first if you need test tokens.</li>
              <li>Create or join a lottery from the menu.</li>
            </ol>
          </AAHero>

          <section className={styles.navCard}>
            <div className={styles.navGrid}>
              <Link href="/aa/create-lottery" className={styles.navLink}>AA Create Lottery</Link>
              <Link href="/aa/join-lottery" className={styles.navLink}>AA Join Lottery</Link>
              <Link href="/aa/faucet" className={styles.navLink}>AA Token Faucet</Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
