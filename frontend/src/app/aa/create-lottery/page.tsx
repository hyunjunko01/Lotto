'use client';
import { useState } from 'react';
import Link from 'next/link';
import { isAddress } from 'viem';
import { AALotteryWorkspace } from '@/components/aa/workspace/AALotteryWorkspace';
import { AAHero } from '@/components/aa/layout/AAHero';
import { AASection } from '@/components/aa/layout/AASection';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import styles from './page.module.css';

const LOTTO_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS;
const ACCOUNT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS;
const ENTRY_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS;

export default function AACreateLotteryPage() {
  const ui = useAAUi();
  const [copyFeedback, setCopyFeedback] = useState('');

  const hasValidFactoryConfig =
    typeof LOTTO_FACTORY_ADDRESS === 'string' &&
    typeof ACCOUNT_FACTORY_ADDRESS === 'string' &&
    typeof ENTRY_TOKEN_ADDRESS === 'string' &&
    isAddress(LOTTO_FACTORY_ADDRESS) &&
    isAddress(ACCOUNT_FACTORY_ADDRESS) &&
    isAddress(ENTRY_TOKEN_ADDRESS);

  const handleCopyAddress = async () => {
    if (!LOTTO_FACTORY_ADDRESS) return;
    try {
      await navigator.clipboard.writeText(LOTTO_FACTORY_ADDRESS);
      setCopyFeedback('COPIED');
      setTimeout(() => setCopyFeedback(''), 1200);
    } catch {
      setCopyFeedback('FAILED');
      setTimeout(() => setCopyFeedback(''), 1200);
    }
  };

  return (
    <main style={ui.pageMain}>
      <div style={ui.container}>
        <Link
          href="/aa"
          className={styles.backLink}
        >
          ← Back to AA Home
        </Link>
        <AAHero ui={ui} pill="AA Create" title="Create Lottery">
          <p className={styles.subtitle}>Set your lottery values and create in one flow.</p>
          <div className={styles.addressRow}>
            <span className={styles.addressText}>
              Lottery Address: {LOTTO_FACTORY_ADDRESS ?? '(missing NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS)'}
            </span>
            {LOTTO_FACTORY_ADDRESS ? (
              <button
                type="button"
                onClick={() => void handleCopyAddress()}
                className={styles.copyButton}
              >
                {copyFeedback || 'COPY'}
              </button>
            ) : null}
          </div>
        </AAHero>

        {!hasValidFactoryConfig ? (
          <AASection ui={ui} style={ui.errorBox}>
            `NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS`, `NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS`, or
            `NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS` is missing or invalid. Check `.env.local` and restart the dev server.
          </AASection>
        ) : (
          <AALotteryWorkspace
            mode="create"
            gasEstimateMode="manual"
            title="Create Lottery Action"
            subtitle="When your AA account is ready, execute create."
            lottoFactoryAddress={LOTTO_FACTORY_ADDRESS}
            accountFactoryAddress={ACCOUNT_FACTORY_ADDRESS}
            entryTokenAddress={ENTRY_TOKEN_ADDRESS}
          />
        )}
      </div>
    </main>
  );
}
