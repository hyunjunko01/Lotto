'use client';

import { AALotteryWorkspace } from '@/components/aa/workspace/AALotteryWorkspace';
import { AAConfigErrorSection } from '@/components/aa/layout/AAConfigErrorSection';
import { AAFlowPage } from '@/components/aa/layout/AAFlowPage';
import { AAHero } from '@/components/aa/layout/AAHero';
import { AAHeroLotteryAddress } from '@/components/aa/layout/AAHeroLotteryAddress';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import heroStyles from '@/components/aa/layout/aaHeroContent.module.css';
import flowLayout from '@/components/aa/layout/aaFlowLayout.module.css';
import { AA_FACTORY_ENV_ERROR, readAAFactoryEnv } from '@/lib/aa/env';

export default function AAFaucetPage() {
  const ui = useAAUi();
  const factoryEnv = readAAFactoryEnv();

  return (
    <AAFlowPage
      hero={
        <AAHero ui={ui} pill="AA Faucet" title="Get Entry Tokens" className={flowLayout.hero}>
          <p className={heroStyles.subtitle}>Add LET to your AA account so you can join lotteries.</p>
          <AAHeroLotteryAddress
            address={factoryEnv?.entryTokenAddress}
            label="Entry Token"
            missingLabel="(missing NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS)"
          />
        </AAHero>
      }
    >
      {!factoryEnv ? (
        <AAConfigErrorSection ui={ui} message={AA_FACTORY_ENV_ERROR} />
      ) : (
        <AALotteryWorkspace
          mode="faucet"
          gasEstimateMode="manual"
          title="Request Tokens"
          subtitle="When your AA account is ready, request test LET."
          lottoFactoryAddress={factoryEnv.lottoFactoryAddress}
          accountFactoryAddress={factoryEnv.accountFactoryAddress}
          entryTokenAddress={factoryEnv.entryTokenAddress}
        />
      )}
    </AAFlowPage>
  );
}
