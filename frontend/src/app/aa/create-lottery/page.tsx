'use client';
import Link from 'next/link';
import { isAddress } from 'viem';
import { AALotteryWorkspace } from '@/components/aa/workspace/AALotteryWorkspace';
import { AAHero } from '@/components/aa/layout/AAHero';
import { AAHeroLotteryAddress } from '@/components/aa/layout/AAHeroLotteryAddress';
import { AASection } from '@/components/aa/layout/AASection';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import heroStyles from '@/components/aa/layout/aaHeroContent.module.css';
import flowLayout from '@/components/aa/layout/aaFlowLayout.module.css';

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
    <main style={ui.pageMain} className={flowLayout.pageMain}>
      <div style={ui.container} className={flowLayout.container}>
        <div className={flowLayout.heroStack}>
          <Link href="/aa" className={flowLayout.backLink}>
            ← Back to AA Home
          </Link>
          <AAHero ui={ui} pill="AA Create" title="Create Lottery" className={flowLayout.hero}>
            <p className={heroStyles.subtitle}>Set lottery values and create in one flow.</p>
            <AAHeroLotteryAddress address={LOTTO_FACTORY_ADDRESS} />
          </AAHero>
        </div>

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
