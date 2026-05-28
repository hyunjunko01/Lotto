'use client';

import Link from 'next/link';
import { isAddress } from 'viem';
import { AALotteryWorkspace } from '@/components/aa/workspace/AALotteryWorkspace';
import { AAHero } from '@/components/aa/layout/AAHero';
import { AASection } from '@/components/aa/layout/AASection';
import { useAAUi } from '@/components/aa/layout/useAAUi';

const LOTTO_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS;
const ACCOUNT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS;
const ENTRY_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS;

export default function AACreateLotteryPage() {
  const ui = useAAUi();

  const hasValidFactoryConfig =
    typeof LOTTO_FACTORY_ADDRESS === 'string' &&
    typeof ACCOUNT_FACTORY_ADDRESS === 'string' &&
    typeof ENTRY_TOKEN_ADDRESS === 'string' &&
    isAddress(LOTTO_FACTORY_ADDRESS) &&
    isAddress(ACCOUNT_FACTORY_ADDRESS) &&
    isAddress(ENTRY_TOKEN_ADDRESS);

  return (
    <main style={ui.pageMain}>
      <div style={ui.container}>
        <Link
          href="/aa"
          style={{
            display: 'inline-flex',
            marginBottom: 14,
            color: '#8fe8ff',
            textDecoration: 'underline',
            fontWeight: 700,
          }}
        >
          ← Back to AA Home
        </Link>
        <AAHero ui={ui} pill="Web3Auth AA Create" title="Create Lottery with AA">
          <p style={ui.subtitle}>The `createAccount` initCode is auto-filled, and this flow only executes `createLotto`.</p>
          <p style={{ marginTop: 10, color: '#d4eaee', wordBreak: 'break-all' }}>
            Target LottoFactory: {LOTTO_FACTORY_ADDRESS ?? '(missing NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS)'}
          </p>
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
            title="Web3Auth AA + Create Lottery"
            subtitle="After Web3Auth login, this flow prepares your AA account and executes `factory.createLotto`."
            lottoFactoryAddress={LOTTO_FACTORY_ADDRESS}
            accountFactoryAddress={ACCOUNT_FACTORY_ADDRESS}
            entryTokenAddress={ENTRY_TOKEN_ADDRESS}
          />
        )}
      </div>
    </main>
  );
}
