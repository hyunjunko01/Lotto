'use client';

import Link from 'next/link';
import { AAHero } from '@/components/aa/layout/AAHero';
import { useAAUi } from '@/components/aa/layout/useAAUi';

export default function AAHomePage() {
  const ui = useAAUi();

  return (
    <main style={ui.pageMain}>
      <div style={ui.container}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            marginBottom: 14,
            color: '#8fe8ff',
            textDecoration: 'underline',
            fontWeight: 700,
          }}
        >
          ← Back to Lotto Home
        </Link>
        <AAHero ui={ui} pill="Web3Auth AA Mode" title="Account Abstraction Workspace">
          <p style={ui.subtitle}>This workspace covers the Web3Auth-based Account Abstraction flow.</p>
        </AAHero>

        <section style={ui.navGrid}>
          <Link href="/aa/create-lottery" style={ui.navLink}>AA Create Lottery</Link>
          <Link href="/aa/join-lottery" style={ui.navLink}>AA Join Lottery</Link>
          <Link href="/aa/faucet" style={ui.navLink}>AA Token Faucet</Link>
        </section>
      </div>
    </main>
  );
}
