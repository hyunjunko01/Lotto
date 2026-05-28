'use client';

import Link from 'next/link';
import styles from './page.module.css';
import { LottoWordmark } from '@/components/shared/LottoWordmark';

export default function HomePage() {
    return (
        <main className={styles.page}>
            <section className={styles.hero}>
                <LottoWordmark className={styles.wordmarkWrap} />
                <div className={styles.actions}>
                    <Link href="/aa" className={`${styles.action} ${styles.primary}`}>
                        Play with AA
                    </Link>
                    <Link href="/metamask" className={`${styles.action} ${styles.secondary}`}>
                        Play with MetaMask
                    </Link>
                </div>
            </section>
        </main>
    );
}
