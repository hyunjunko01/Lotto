'use client';

import Link from 'next/link';
import { isAddress } from 'viem';
import { AALotteryWorkspace } from '@/components/aa/workspace/AALotteryWorkspace';
import { AAHero } from '@/components/aa/layout/AAHero';
import { AASection } from '@/components/aa/layout/AASection';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import styles from './page.module.css';

const ENTRY_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS;
const ACCOUNT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS;
const LOTTO_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS;

export default function AAFaucetPage() {
  const ui = useAAUi();

  const hasValidConfig =
    typeof ENTRY_TOKEN_ADDRESS === 'string' &&
    isAddress(ENTRY_TOKEN_ADDRESS) &&
    typeof ACCOUNT_FACTORY_ADDRESS === 'string' &&
    isAddress(ACCOUNT_FACTORY_ADDRESS) &&
    typeof LOTTO_FACTORY_ADDRESS === 'string' &&
    isAddress(LOTTO_FACTORY_ADDRESS);

  return (
    <main style={ui.pageMain}>
      <div style={ui.container}>
        <Link
          href="/aa"
          className={styles.backLink}
        >
          ← Back to AA Home
        </Link>
        <AAHero ui={ui} pill="Web3Auth AA Faucet" title="Charge Entry Tokens (AA)">
          <p style={ui.subtitle}>Your AA account calls `claimTestTokens()` via a UserOp.</p>
          <p className={styles.metaRow}>
            Entry Token: {ENTRY_TOKEN_ADDRESS ?? '(missing NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS)'}
          </p>
        </AAHero>

        {!hasValidConfig ? (
          <AASection ui={ui} style={ui.errorBox}>
            `NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS`, `NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS`, or
            `NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS` is missing or invalid.
          </AASection>
        ) : (
          <AALotteryWorkspace
            mode="faucet"
            gasEstimateMode="manual"
            title="Web3Auth AA + Token Faucet"
            subtitle="After login, sign and send a UserOperation to call the faucet from your AA account."
            lottoFactoryAddress={LOTTO_FACTORY_ADDRESS}
            accountFactoryAddress={ACCOUNT_FACTORY_ADDRESS}
            entryTokenAddress={ENTRY_TOKEN_ADDRESS}
          />
        )}
      </div>
    </main>
  );
}
